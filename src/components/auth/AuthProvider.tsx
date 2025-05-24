import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/database';
import { tenantContextService } from '@/services/SharedTenantContextService';
import { authService, AuthResult } from '@/services/authService';
import { useCSRFProtection } from '@/hooks/useCSRFProtection';
import { useErrorNotification } from '@/hooks/useErrorNotification';
import { ErrorService } from '@/services/ErrorService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  currentTenantId: string | null;
  switchTenant: (tenantId: string) => Promise<boolean>;
  isAuthenticated: boolean;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const { token: csrfToken, isValid: csrfValid } = useCSRFProtection();
  const { showError, showSuccess } = useErrorNotification();

  useEffect(() => {
    console.log('🔄 AuthProvider: Initializing auth state...');
    
    // Only proceed if CSRF protection is ready
    if (!csrfValid) {
      console.log('🛡️ Waiting for CSRF protection to initialize...');
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Error getting initial session:', error);
        setAuthError('Failed to initialize authentication');
      } else {
        console.log('📱 Initial session:', !!session);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Set tenant context in background if user exists
        if (session?.user) {
          setTenantContextInBackground(session.user.id);
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clear any previous auth errors on successful state change
        if (session) {
          setAuthError(null);
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out - clearing state');
          setCurrentTenantId(null);
          setAuthError(null);
          tenantContextService.clearContext();
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 User signed in:', session.user.email);
          setTenantContextInBackground(session.user.id);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed for user:', session?.user?.email);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [csrfValid]);

  // Non-blocking tenant context setup
  const setTenantContextInBackground = async (userId: string) => {
    try {
      await tenantContextService.setUserContextAsync(userId);
      const tenantId = tenantContextService.getCurrentTenantId();
      if (tenantId) {
        setCurrentTenantId(tenantId);
        console.log('✅ Tenant context set in background:', tenantId);
      }
    } catch (error) {
      console.warn('⚠️ Background tenant context setup failed:', error);
      // Continue without tenant context - non-blocking
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      const result = await authService.signUp({ email, password, firstName, lastName });
      
      if (!result.success && result.error) {
        const appError = ErrorService.categorizeError({ message: result.error });
        setAuthError(appError.message);
        
        showError({
          title: 'Registration Failed',
          description: appError.message,
          action: appError.retryAction ? {
            label: ErrorService.getRecoveryAction(appError) || 'Try Again',
            onClick: appError.retryAction
          } : undefined
        });
      } else if (result.success && result.requiresVerification) {
        showSuccess('Registration successful! Please check your email to verify your account.');
      }
      
      return result;
    } catch (error) {
      console.error('Signup error in provider:', error);
      const appError = ErrorService.categorizeError(error);
      setAuthError(appError.message);
      
      showError({
        title: 'Registration Error',
        description: appError.message
      });
      
      return { success: false, error: appError.message };
    }
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      const result = await authService.signIn(email, password);
      
      if (!result.success && result.error) {
        const appError = ErrorService.categorizeError({ message: result.error });
        setAuthError(appError.message);
        
        showError({
          title: 'Login Failed',
          description: appError.message,
          action: appError.retryAction ? {
            label: ErrorService.getRecoveryAction(appError) || 'Try Again',
            onClick: appError.retryAction
          } : undefined
        });
      }
      
      return result;
    } catch (error) {
      console.error('Signin error in provider:', error);
      const appError = ErrorService.categorizeError(error);
      setAuthError(appError.message);
      
      showError({
        title: 'Login Error',
        description: appError.message
      });
      
      return { success: false, error: appError.message };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setAuthError(null);
      console.log('🚪 Starting logout...');
      await authService.signOut();
      showSuccess('You have been successfully logged out.');
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('💥 Logout failed:', error);
      const appError = ErrorService.categorizeError(error);
      setAuthError(appError.message);
      
      showError({
        title: 'Logout Failed',
        description: appError.message
      });
      
      // Clear state even on error
      setSession(null);
      setUser(null);
      setCurrentTenantId(null);
      tenantContextService.clearContext();
    }
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      const result = await authService.resetPassword(email);
      
      if (result.success) {
        showSuccess('Password reset email sent! Please check your inbox.');
      } else if (result.error) {
        const appError = ErrorService.categorizeError({ message: result.error });
        setAuthError(appError.message);
        showError({
          title: 'Password Reset Failed',
          description: appError.message
        });
      }
      
      return result;
    } catch (error) {
      console.error('Password reset error in provider:', error);
      const appError = ErrorService.categorizeError(error);
      setAuthError(appError.message);
      showError({
        title: 'Password Reset Error',
        description: appError.message
      });
      return { success: false, error: appError.message };
    }
  };

  const updatePassword = async (newPassword: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      const result = await authService.updatePassword(newPassword);
      
      if (!result.success && result.error) {
        setAuthError(result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Password update error in provider:', error);
      const errorMessage = 'Failed to update password';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const switchTenant = async (tenantId: string): Promise<boolean> => {
    if (!user) {
      setAuthError('No user logged in');
      return false;
    }

    try {
      setAuthError(null);
      const result = await tenantContextService.switchTenantContext(user.id, tenantId);
      if (result.success) {
        setCurrentTenantId(tenantId);
        return true;
      } else {
        setAuthError('Failed to switch tenant');
        return false;
      }
    } catch (error) {
      console.error('Tenant switch error:', error);
      setAuthError('An error occurred while switching tenant');
      return false;
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const value = {
    user,
    session,
    loading: loading || !csrfValid,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    currentTenantId,
    switchTenant,
    isAuthenticated: !!user,
    authError,
    clearAuthError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
