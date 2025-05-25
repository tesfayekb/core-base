
// Authentication Context with Audit Logging Integration
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/services/database';
import { enhancedAuditService } from '@/services/audit/enhancedAuditService';

interface AuthUser extends User {
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  tenantId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user as AuthUser);
        // Load tenant context for user
        loadUserTenant(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user as AuthUser);
        await loadUserTenant(session.user.id);
        
        // Log authentication events
        if (event === 'SIGNED_IN') {
          await enhancedAuditService.logAuthEvent('login', 'success', session.user.id);
        }
      } else {
        setUser(null);
        setTenantId(null);
        
        // Log logout event
        if (event === 'SIGNED_OUT') {
          await enhancedAuditService.logAuthEvent('logout', 'success');
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserTenant = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        setTenantId(data.tenant_id);
      }
    } catch (error) {
      console.error('Failed to load user tenant:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Log failed login attempt
        await enhancedAuditService.logAuthEvent('login', 'failure', undefined, {
          email,
          error: error.message
        });
        
        return { success: false, error: 'Invalid email or password' };
      }

      if (data.user) {
        // Log successful login
        await enhancedAuditService.logAuthEvent('login', 'success', data.user.id, {
          email
        });
        
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      // Log login error
      await enhancedAuditService.logAuthEvent('login', 'error', undefined, {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`
          }
        }
      });

      if (error) {
        // Log failed registration
        await enhancedAuditService.logAuthEvent('register', 'failure', undefined, {
          email,
          error: error.message
        });
        
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Log successful registration
        await enhancedAuditService.logAuthEvent('register', 'success', data.user.id, {
          email,
          firstName,
          lastName
        });
        
        return { 
          success: true, 
          requiresVerification: !data.session 
        };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error) {
      // Log registration error
      await enhancedAuditService.logAuthEvent('register', 'error', undefined, {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, error: 'An error occurred during registration' };
    }
  };

  const signOut = async () => {
    try {
      const currentUserId = user?.id;
      await supabase.auth.signOut();
      
      // Log logout
      await enhancedAuditService.logAuthEvent('logout', 'success', currentUserId);
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Log logout error
      await enhancedAuditService.logAuthEvent('logout', 'error', user?.id);
    }
  };

  const switchTenant = async (newTenantId: string) => {
    try {
      if (user) {
        setTenantId(newTenantId);
        
        // Log tenant switch
        await enhancedAuditService.logSecurityEvent(
          'access_denied', // This might need a better event type
          {
            action: 'tenant_switch',
            fromTenant: tenantId,
            toTenant: newTenantId
          },
          'success'
        );
      }
    } catch (error) {
      console.error('Tenant switch error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenantId,
        loading,
        signIn,
        signUp,
        signOut,
        switchTenant
      }}
    >
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
