
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/database';
import { tenantContextService } from '@/services/SharedTenantContextService';
import { authService, AuthResult } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  currentTenantId: string | null;
  switchTenant: (tenantId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 AuthProvider: Initializing auth state...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📱 Initial session:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Set tenant context in background if user exists
      if (session?.user) {
        setTenantContextInBackground(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out - clearing state');
          setCurrentTenantId(null);
          tenantContextService.clearContext();
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 User signed in:', session.user.email);
          // Set tenant context in background - non-blocking
          setTenantContextInBackground(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
      const result = await authService.signUp({ email, password, firstName, lastName });
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Signup failed' };
    }
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const result = await authService.signIn(email, password);
      // Don't set loading here - auth state change will handle UI updates
      return result;
    } catch (error) {
      console.error('Signin error:', error);
      return { success: false, error: 'Signin failed' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Starting logout...');
      await authService.signOut();
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('💥 Logout failed:', error);
      // Clear state even on error
      setSession(null);
      setUser(null);
      setCurrentTenantId(null);
      tenantContextService.clearContext();
    }
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    return authService.resetPassword(email);
  };

  const switchTenant = async (tenantId: string): Promise<boolean> => {
    if (!user) return false;

    const result = await tenantContextService.switchTenantContext(user.id, tenantId);
    if (result.success) {
      setCurrentTenantId(tenantId);
      return true;
    }
    return false;
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    currentTenantId,
    switchTenant
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
