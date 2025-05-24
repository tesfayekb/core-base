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
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out - clearing state');
          setSession(null);
          setUser(null);
          setCurrentTenantId(null);
          tenantContextService.clearContext();
          setLoading(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 User signed in:', session.user.email);
          setSession(session);
          setUser(session.user);
          
          // PERFORMANCE OPTIMIZATION: Set loading to false immediately for fast UI response
          setLoading(false);
          
          // PERFORMANCE OPTIMIZATION: Set tenant context asynchronously (non-blocking)
          // This follows our performance standards for < 200ms authentication
          tenantContextService.setUserContextAsync(session.user.id).then(() => {
            const tenantId = tenantContextService.getCurrentTenantId();
            if (tenantId) {
              setCurrentTenantId(tenantId);
              console.log('✅ Tenant context set in background:', tenantId);
            }
          }).catch(error => {
            console.warn('⚠️ Background tenant context setup failed:', error);
            // Non-blocking: Continue with auth flow even if tenant setup fails
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Token refreshed');
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        } else {
          console.log('🔄 Other auth event:', event);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const result = await authService.signUp({ email, password, firstName, lastName });
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const result = await authService.signIn(email, password);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Starting logout...');
      
      // Clear state immediately for instant UI response
      setSession(null);
      setUser(null);
      setCurrentTenantId(null);
      tenantContextService.clearContext();
      
      // Call auth service signout
      await authService.signOut();
      
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('💥 Logout failed:', error);
      // Ensure state is cleared even on error
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
