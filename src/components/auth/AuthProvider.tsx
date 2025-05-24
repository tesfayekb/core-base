
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
      console.log('Initial session:', session);
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
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 User signed in:', session.user.email);
          setSession(session);
          setUser(session.user);
          await tenantContextService.setUserContext(session.user.id);
        } else {
          console.log('🔄 Other auth event:', event);
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      console.log('🚀 Attempting Supabase signup for:', email);
      
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

      console.log('📋 Signup response data:', !!data);
      console.log('📋 Signup response error:', error?.message);

      if (error) {
        console.error('❌ Signup failed:', error.message);
        
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password format' };
        }
        if (error.message.includes('User already registered')) {
          return { error: 'An account with this email already exists' };
        }
        if (error.message.includes('Password should be')) {
          return { error: 'Password must be at least 6 characters long' };
        }
        if (error.message.includes('Unable to validate email address')) {
          return { error: 'Please enter a valid email address' };
        }
        
        return { error: error.message };
      }

      console.log('🎉 Signup successful!');
      return { user: data.user };
      
    } catch (error) {
      console.error('💥 Signup exception:', error);
      
      // Handle network/connection errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { error: 'Network connection failed. Please check your internet connection and try again.' };
      }
      
      return { error: 'An unexpected error occurred during signup. Please try again.' };
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
      console.log('🚪 Starting logout process...');
      
      // Clear local state first
      tenantContextService.clearContext();
      setCurrentTenantId(null);
      
      console.log('🚪 Calling supabase.auth.signOut()...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Supabase signout error:', error);
        throw error;
      }
      
      console.log('✅ Supabase signout successful');
      
      // The onAuthStateChange listener should handle the rest
      
    } catch (error) {
      console.error('💥 Signout failed:', error);
      // Even if there's an error, try to clear local state
      setSession(null);
      setUser(null);
      setCurrentTenantId(null);
      tenantContextService.clearContext();
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
