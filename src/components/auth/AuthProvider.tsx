
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
      console.log('🚀 Starting Supabase signup for:', email);
      console.log('📍 Supabase URL:', 'https://fhzhlyskafjvcwcqjssmb.supabase.co');
      
      // Test basic connectivity first
      console.log('🔍 Testing basic connectivity...');
      try {
        const response = await fetch('https://httpbin.org/get', { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        console.log('✅ Basic internet connectivity working:', response.status);
      } catch (connectivityError) {
        console.error('❌ No internet connectivity:', connectivityError);
        return { error: 'No internet connection detected. Please check your network.' };
      }

      // Test Supabase project accessibility
      console.log('🔍 Testing Supabase project accessibility...');
      try {
        const supabaseResponse = await fetch('https://fhzhlyskafjvcwcqjssmb.supabase.co/rest/v1/', {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        console.log('✅ Supabase project accessible:', supabaseResponse.status);
      } catch (supabaseError) {
        console.error('❌ Cannot reach Supabase project:', supabaseError);
        
        if (supabaseError.name === 'AbortError') {
          return { error: 'Connection to Supabase timed out. Please check your network or try again later.' };
        }
        
        return { error: 'Cannot connect to authentication service. This may be due to network restrictions or firewall settings.' };
      }

      console.log('🔐 Attempting authentication signup...');
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

      console.log('📋 Signup response:', { data: !!data, error: error?.message });

      if (error) {
        console.error('❌ Signup failed:', error.message);
        return { error: error.message };
      }

      console.log('🎉 Signup successful!');
      return { user: data.user };
      
    } catch (error) {
      console.error('💥 Signup exception:', error);
      
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
