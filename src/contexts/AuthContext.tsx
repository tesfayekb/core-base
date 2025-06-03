
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  currentTenantId: string | null;
  tenantId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  refreshSession: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  switchTenant: (tenantId: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        // Set a default tenant ID for now
        setCurrentTenantId('50a9eb00-510b-40db-935e-9ea8e0e988e6');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          setCurrentTenantId('50a9eb00-510b-40db-935e-9ea8e0e988e6');
        } else {
          setUser(null);
          setCurrentTenantId(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
    }
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    setAuthError(null);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    if (error) {
      setAuthError(error.message);
    }
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setCurrentTenantId(null);
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setAuthError(error.message);
    }
    return { error };
  };

  const updatePassword = async (password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setAuthError(error.message);
    }
    return { error };
  };

  const refreshSession = async () => {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      setAuthError(error.message);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const switchTenant = async (tenantId: string) => {
    setCurrentTenantId(tenantId);
  };

  const contextValue: AuthContextType = {
    user,
    session,
    currentTenantId,
    tenantId: currentTenantId, // Alias for backward compatibility
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
    authError,
    clearAuthError,
    switchTenant,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Backward compatibility alias
export const useAuthCompat = useAuth;

export { AuthContext };
