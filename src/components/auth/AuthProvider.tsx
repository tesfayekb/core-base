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
      console.log('=== SIGNUP DEBUG START ===');
      console.log('Attempting signup for:', email);
      console.log('Supabase URL:', 'https://fhzhlyskafjvcwcqjssmb.supabase.co');
      console.log('Using anon key:', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk');
      console.log('Current timestamp:', new Date().toISOString());
      console.log('Browser user agent:', navigator.userAgent);
      console.log('Network connection status:', navigator.onLine);
      
      // Test basic connectivity to Supabase
      console.log('Testing basic connectivity to Supabase...');
      try {
        const testUrl = 'https://fhzhlyskafjvcwcqjssmb.supabase.co/rest/v1/';
        console.log('Test URL:', testUrl);
        
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk',
            'Content-Type': 'application/json'
          }
        });
        console.log('Basic connectivity test - Status:', testResponse.status);
        console.log('Basic connectivity test - OK:', testResponse.ok);
        console.log('Basic connectivity test - Headers:', Object.fromEntries(testResponse.headers.entries()));
        
        if (testResponse.ok) {
          console.log('✅ Basic connectivity to Supabase is working');
        } else {
          console.warn('⚠️ Basic connectivity test returned non-200 status');
        }
      } catch (fetchError) {
        console.error('❌ Basic connectivity test failed:', fetchError);
        console.error('This indicates a fundamental network connectivity issue');
      }
      
      // Test auth endpoint specifically
      console.log('Testing auth endpoint connectivity...');
      try {
        const authTestUrl = 'https://fhzhlyskafjvcwcqjssmb.supabase.co/auth/v1/settings';
        const authTestResponse = await fetch(authTestUrl, {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk'
          }
        });
        console.log('Auth endpoint test - Status:', authTestResponse.status);
        console.log('Auth endpoint test - OK:', authTestResponse.ok);
      } catch (authError) {
        console.error('❌ Auth endpoint test failed:', authError);
      }
      
      console.log('Attempting Supabase auth signup...');
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

      console.log('Supabase signup response:', { data, error });

      if (error) {
        console.error('Signup error details:', {
          message: error.message,
          status: error.status,
          code: error.code || 'no_code',
          name: error.name
        });
        return { error: error.message };
      }

      console.log('Signup successful:', data);
      console.log('=== SIGNUP DEBUG END ===');
      return { user: data.user };
    } catch (error) {
      console.error('=== SIGNUP EXCEPTION ===');
      console.error('Signup failed with exception:', error);
      console.error('Error details:', {
        type: typeof error,
        constructor: error?.constructor?.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Check if this is a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🔍 NETWORK CONNECTIVITY ANALYSIS:');
        console.error('1. Check if Supabase project is active (not paused)');
        console.error('2. Verify CORS settings in Supabase dashboard');
        console.error('3. Check browser network developer tools');
        console.error('4. Try disabling ad blockers or browser extensions');
        console.error('5. Check if corporate firewall is blocking requests');
        console.error('6. Verify project URL and API keys are correct');
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
