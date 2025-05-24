
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, tenantContextService } from '@/services/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error?: string; user?: User }>;
  signIn: (email: string, password: string) => Promise<{ error?: string; user?: User }>;
  signOut: () => Promise<void>;
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Set user context when authenticated
        if (session?.user) {
          await tenantContextService.setUserContext(session.user.id);
        } else {
          tenantContextService.clearContext();
          setCurrentTenantId(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        return { error: error.message };
      }

      return { user: data.user };
    } catch (error) {
      console.error('Signup failed:', error);
      return { error: 'An unexpected error occurred during signup' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Signin error:', error);
        return { error: error.message };
      }

      return { user: data.user };
    } catch (error) {
      console.error('Signin failed:', error);
      return { error: 'An unexpected error occurred during signin' };
    }
  };

  const signOut = async () => {
    try {
      tenantContextService.clearContext();
      setCurrentTenantId(null);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Signout failed:', error);
    }
  };

  const switchTenant = async (tenantId: string) => {
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
