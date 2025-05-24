
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
          setLoading(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 User signed in:', session.user.email);
          setSession(session);
          setUser(session.user);
          
          // Set loading to false immediately, don't wait for tenant context
          setLoading(false);
          
          // Set tenant context in background (non-blocking)
          try {
            await tenantContextService.setUserContext(session.user.id);
            console.log('✅ Tenant context set successfully');
          } catch (error) {
            console.warn('⚠️ Failed to set tenant context:', error);
            // Don't block the auth flow for tenant context failures
          }
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
      
      // Clear local state immediately for better UX
      console.log('🧹 Clearing local state immediately...');
      setLoading(true);
      setSession(null);
      setUser(null);
      setCurrentTenantId(null);
      tenantContextService.clearContext();
      
      console.log('🚪 Calling supabase.auth.signOut()...');
      
      // Reduced timeout to 3 seconds for better UX
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Signout timeout after 3 seconds')), 3000)
      );
      
      try {
        const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('❌ Supabase signout error:', error);
        } else {
          console.log('✅ Supabase signout successful');
        }
      } catch (timeoutError) {
        console.warn('⏰ Signout timed out, but local state cleared');
        // Don't throw - we've already cleared local state
      }
      
      setLoading(false);
      console.log('✅ Logout process completed');
      
    } catch (error) {
      console.error('💥 Signout failed:', error);
      // Ensure we always clear state and stop loading
      console.log('🆘 Ensuring clean state after error');
      setSession(null);
      setUser(null);
      setCurrentTenantId(null);
      tenantContextService.clearContext();
      setLoading(false);
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
