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
      console.log('🚀 === COMPREHENSIVE SIGNUP DEBUG START ===');
      console.log('📧 Email:', email);
      console.log('🌐 Supabase URL:', 'https://fhzhlyskafjvcwcqjssmb.supabase.co');
      console.log('🔑 API Key (first 50 chars):', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...'.substring(0, 50));
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('🖥️ User Agent:', navigator.userAgent);
      console.log('📶 Online Status:', navigator.onLine);
      console.log('🌍 Location:', window.location.href);
      
      // Test if we can reach any external endpoint
      console.log('🔍 Testing external connectivity...');
      try {
        const externalTest = await fetch('https://httpbin.org/get', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ External connectivity test - Status:', externalTest.status);
        console.log('✅ External connectivity: WORKING');
      } catch (externalError) {
        console.error('❌ External connectivity test failed:', externalError);
        console.error('🚨 CRITICAL: No external internet connectivity detected');
      }

      // Test direct domain resolution
      console.log('🔍 Testing Supabase domain resolution...');
      try {
        const domainTest = await fetch('https://supabase.com/favicon.ico', { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        console.log('✅ Supabase domain resolution: WORKING');
      } catch (domainError) {
        console.error('❌ Supabase domain resolution failed:', domainError);
      }

      // Test specific project connectivity with detailed logging
      console.log('🔍 Testing project-specific connectivity...');
      const projectUrl = 'https://fhzhlyskafjvcwcqjssmb.supabase.co/rest/v1/';
      console.log('🎯 Target URL:', projectUrl);
      
      try {
        const projectTest = await fetch(projectUrl, {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk',
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          }
        });
        console.log('✅ Project connectivity test - Status:', projectTest.status);
        console.log('✅ Project connectivity test - Headers:', Object.fromEntries(projectTest.headers.entries()));
        
        if (projectTest.ok) {
          console.log('🎉 Project connectivity: WORKING');
        } else {
          console.warn('⚠️ Project responded but with error status');
          const responseText = await projectTest.text();
          console.log('📄 Response body:', responseText);
        }
      } catch (projectError) {
        console.error('❌ Project connectivity test failed:', projectError);
        console.error('🔍 Error name:', projectError.name);
        console.error('🔍 Error message:', projectError.message);
        
        if (projectError.name === 'TypeError' && projectError.message.includes('fetch')) {
          console.error('🚨 NETWORK ISSUE DETECTED:');
          console.error('  • This is a fundamental network connectivity problem');
          console.error('  • Request never reached Supabase servers');
          console.error('  • Likely causes: CORS, firewall, or proxy blocking');
        }
      }

      // Test auth endpoint specifically
      console.log('🔍 Testing auth endpoint...');
      const authUrl = 'https://fhzhlyskafjvcwcqjssmb.supabase.co/auth/v1/settings';
      try {
        const authTest = await fetch(authUrl, {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk'
          }
        });
        console.log('✅ Auth endpoint test - Status:', authTest.status);
        if (authTest.ok) {
          console.log('🎉 Auth endpoint connectivity: WORKING');
        }
      } catch (authError) {
        console.error('❌ Auth endpoint test failed:', authError);
      }

      console.log('🚀 Attempting Supabase signup...');
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

      console.log('📋 Supabase signup response:', { data, error });

      if (error) {
        console.error('❌ Signup error details:', {
          message: error.message,
          status: error.status,
          code: error.code || 'no_code',
          name: error.name
        });
        return { error: error.message };
      }

      console.log('🎉 Signup successful:', data);
      console.log('🏁 === SIGNUP DEBUG END ===');
      return { user: data.user };
    } catch (error) {
      console.error('💥 === SIGNUP EXCEPTION ===');
      console.error('❌ Signup failed with exception:', error);
      console.error('🔍 Error details:', {
        type: typeof error,
        constructor: error?.constructor?.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🆘 TROUBLESHOOTING GUIDE:');
        console.error('1. 🌐 Check your Supabase project dashboard');
        console.error('2. 🛡️ Verify CORS settings include your domain:', window.location.origin);
        console.error('3. 🚫 Disable ad blockers and browser extensions');
        console.error('4. 🔒 Check if corporate firewall is blocking requests');
        console.error('5. 🔄 Try opening your Supabase project URL directly in browser');
        console.error('6. 📱 Test on different network/device');
        console.error('7. 🔧 Check browser developer tools Network tab');
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
