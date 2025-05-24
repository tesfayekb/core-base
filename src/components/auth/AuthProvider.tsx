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
    // Validate Supabase configuration
    console.log('Supabase URL:', supabase.supabaseUrl);
    console.log('Supabase Key (first 20 chars):', supabase.supabaseKey.substring(0, 20) + '...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Set user context when authenticated
        if (session?.user) {
          console.log('Setting user context for:', session.user.id);
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
      console.log('Attempting signup for:', email);
      console.log('Supabase client status:', !!supabase);
      console.log('Auth client status:', !!supabase.auth);
      
      // Test basic connectivity first
      console.log('Testing Supabase connectivity...');
      
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

      console.log('Supabase response data:', data);
      console.log('Supabase response error:', error);

      if (error) {
        console.error('Signup error details:', {
          message: error.message,
          status: error.status,
          code: error.code || 'no_code'
        });
        return { error: error.message };
      }

      console.log('Signup successful:', data);
      return { user: data.user };
    } catch (error) {
      console.error('Signup failed with exception:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error properties:', Object.keys(error || {}));
      
      // More detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      return { error: 'Network connection failed. Please check your internet connection and try again.' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting signin for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Signin error:', error);
        return { error: error.message };
      }

      console.log('Signin successful:', data);
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
