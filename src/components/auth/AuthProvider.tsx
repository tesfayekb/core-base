import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/database';
import { tenantContextService } from '@/services/SharedTenantContextService';
import { authService, AuthResult } from '@/services/authService';
import { useCSRFProtection } from '@/hooks/useCSRFProtection';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  currentTenantId: string | null;
  switchTenant: (tenantId: string) => Promise<boolean>;
  isAuthenticated: boolean;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const { token: csrfToken, isValid: csrfValid } = useCSRFProtection();

  useEffect(() => {
    console.log('🔄 AuthProvider: Initializing auth state...');
    
    // Only proceed if CSRF protection is ready
    if (!csrfValid) {
      console.log('🛡️ Waiting for CSRF protection to initialize...');
      return;
    }

    // Get initial session
    const checkUserSession = async () => {
      try {
        console.log('🔍 Starting session check...');
        setLoading(true);
        
        // Check if in demo mode
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.log('🎭 Demo mode detected - no Supabase config');
          setUser(null);
          setSession(null);
          return;
        }

        console.log('📡 Fetching session from Supabase...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session fetch error:', sessionError);
          setAuthError('Failed to check authentication status');
          return;
        }
        
        console.log('📋 Session result:', session ? `Found (${session.user.email})` : 'No session');
        
        if (session?.user) {
          setUser(session.user);
          setSession(session);
          console.log('✅ User authenticated:', session.user.email);
          
          // Get user's tenants
          console.log('🏢 Fetching user tenants...');
          const { data: userTenants, error: tenantsError } = await supabase
            .from('user_tenants')
            .select('tenant_id, is_primary')
            .eq('user_id', session.user.id);
          
          if (tenantsError) {
            console.error('❌ Failed to fetch user tenants:', tenantsError);
            // Create initial tenant if error is about missing data
            if (tenantsError.code === '42P01' || tenantsError.message?.includes('relation')) {
              console.log('📦 Tables might not exist, check migrations');
            } else {
              console.log('🔨 Creating initial tenant due to error...');
              await createInitialTenant(session.user.id);
            }
          } else if (!userTenants || userTenants.length === 0) {
            console.log('🔨 No tenants found, creating initial tenant...');
            await createInitialTenant(session.user.id);
          } else {
            // Set primary tenant or first tenant
            const primaryTenant = userTenants.find(ut => ut.is_primary) || userTenants[0];
            setCurrentTenantId(primaryTenant.tenant_id);
            console.log('✅ Current tenant set:', primaryTenant.tenant_id);
          }
        } else {
          console.log('👤 No active session - user not authenticated');
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('💥 Session check error:', error);
        setAuthError('Authentication error occurred');
      } finally {
        setLoading(false);
        console.log('✅ Session check complete');
      }
    };

    checkUserSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clear any previous auth errors on successful state change
        if (session) {
          setAuthError(null);
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out - clearing state');
          setCurrentTenantId(null);
          setAuthError(null);
          tenantContextService.clearContext();
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 User signed in:', session.user.email);
          setTenantContextInBackground(session.user.id);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed for user:', session?.user?.email);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [csrfValid]);

  // Non-blocking tenant context setup
  const setTenantContextInBackground = async (userId: string) => {
    try {
      await tenantContextService.setUserContextAsync(userId);
      const tenantId = tenantContextService.getCurrentTenantId();
      if (tenantId) {
        setCurrentTenantId(tenantId);
        console.log('✅ Tenant context set in background:', tenantId);
      } else {
        // TEMPORARY: Create initial tenant for new users
        console.log('No tenant found, creating initial setup...');
        await createInitialTenantForUser(userId);
        // Try setting context again
        await tenantContextService.setUserContextAsync(userId);
        const newTenantId = tenantContextService.getCurrentTenantId();
        if (newTenantId) {
          setCurrentTenantId(newTenantId);
          console.log('✅ Initial tenant created and set:', newTenantId);
        }
      }
    } catch (error) {
      console.warn('⚠️ Background tenant context setup failed:', error);
      // Continue without tenant context - non-blocking
    }
  };

  const createInitialTenant = async (userId: string) => {
    try {
      console.log('🏗️ Starting initial tenant creation for user:', userId);
      
      const { data: existingTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1);
      
      if (existingTenants && existingTenants.length > 0) {
        console.log('✅ User already has tenants, skipping creation');
        setCurrentTenantId(existingTenants[0].tenant_id);
        return;
      }

      // Generate unique slug
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const slug = `org-${timestamp}-${randomSuffix}`;
      
      console.log('📝 Creating tenant with slug:', slug);

      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'My Organization',
          slug: slug, // Use unique slug
          status: 'active',
          settings: {
            features: {
              userManagement: true,
              advancedRBAC: true,
              auditLogs: true
            }
          }
        })
        .select()
        .single();
      
      if (tenantError) {
        console.error('❌ Tenant creation error:', tenantError);
        throw tenantError;
      }
      
      console.log('✅ Tenant created:', tenant.id);

      // Add user to tenant
      console.log('👥 Adding user to tenant...');
      const { error: membershipError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: userId,
          tenant_id: tenant.id,
          is_primary: true
        });
      
      if (membershipError) {
        console.error('❌ Membership creation error:', membershipError);
        throw membershipError;
      }
      
      console.log('✅ User added to tenant');

      // Create SuperAdmin role
      console.log('👑 Creating SuperAdmin role...');
      const { data: superAdminRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          tenant_id: tenant.id,
          name: 'SuperAdmin',
          description: 'System-wide administrator with full access',
          is_system_role: true,
          metadata: {
            permissions: ['*'],
            system_role: true
          }
        })
        .select()
        .single();
      
      if (roleError) {
        console.error('⚠️ Role creation error:', roleError);
        // Continue even if role creation fails
      } else if (superAdminRole) {
        console.log('✅ SuperAdmin role created:', superAdminRole.id);
        
        // Assign SuperAdmin role to user
        console.log('🎖️ Assigning SuperAdmin role to user...');
        const { error: assignError } = await supabase
          .from('user_roles')
          .insert({
            tenant_id: tenant.id,
            user_id: userId,
            role_id: superAdminRole.id,
            assigned_by: userId
          });
        
        if (assignError) {
          console.error('⚠️ Role assignment error:', assignError);
        } else {
          console.log('✅ SuperAdmin role assigned to user');
        }
      }

      // Update user profile if needed
      console.log('👤 Updating user profile...');
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: user?.email,
          first_name: user?.user_metadata?.first_name || 'User',
          last_name: user?.user_metadata?.last_name || '',
          status: 'active'
        });
      
      if (profileError) {
        console.warn('⚠️ Profile update error:', profileError);
      } else {
        console.log('✅ User profile updated');
      }
      
      // Set the tenant ID
      setCurrentTenantId(tenant.id);
      console.log('✅ Initial tenant setup complete, tenant ID:', tenant.id);
      
    } catch (error) {
      console.error('💥 Failed to create initial tenant:', error);
      setAuthError('Failed to set up your account. Please try refreshing the page.');
    }
  };

  const createInitialTenantForUser = async (userId: string) => {
    try {
      const { data: existingTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1);
      
      if (existingTenants && existingTenants.length > 0) {
        return; // User already has tenants
      }

      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'My Organization',
          slug: 'my-organization',
          status: 'active',
          settings: {
            features: {
              userManagement: true,
              advancedRBAC: true,
              auditLogs: true
            }
          }
        })
        .select()
        .single();
      
      if (tenantError) throw tenantError;

      // Add user to tenant
      const { error: membershipError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: userId,
          tenant_id: tenant.id,
          is_primary: true
        });
      
      if (membershipError) throw membershipError;

      // Create SuperAdmin role
      const { data: superAdminRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          tenant_id: tenant.id,
          name: 'SuperAdmin',
          description: 'System-wide administrator with full access',
          is_system_role: true,
          metadata: {
            permissions: ['*'],
            system_role: true
          }
        })
        .select()
        .single();
      
      if (!roleError && superAdminRole) {
        // Assign SuperAdmin role to user
        await supabase
          .from('user_roles')
          .insert({
            tenant_id: tenant.id,
            user_id: userId,
            role_id: superAdminRole.id,
            assigned_by: userId
          });
        
        console.log('✅ Assigned SuperAdmin role to user');
      }

      // Update user profile if needed
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: user?.email,
          first_name: user?.user_metadata?.first_name || 'User',
          last_name: user?.user_metadata?.last_name || '',
          status: 'active'
        });
      
      if (profileError) console.warn('Profile update error:', profileError);

      console.log('✅ Initial tenant setup complete');
    } catch (error) {
      console.error('Failed to create initial tenant:', error);
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      const result = await authService.signUp({ email, password, firstName, lastName });
      
      if (!result.success && result.error) {
        setAuthError(result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Signup error in provider:', error);
      const errorMessage = 'An unexpected error occurred during registration';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    try {
      // Check if Supabase is configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        // Demo mode - allow demo login
        if (email === 'demo@example.com' && password === 'demo123') {
          const demoUser = {
            id: 'demo-user-id',
            email: 'demo@example.com',
            user_metadata: {
              first_name: 'Demo',
              last_name: 'User'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            aud: 'authenticated',
            role: 'authenticated'
          } as any;
          
          setUser(demoUser);
          setSession({ 
            user: demoUser,
            access_token: 'demo-token',
            refresh_token: 'demo-refresh',
            expires_at: Date.now() + 3600000,
            expires_in: 3600,
            token_type: 'bearer'
          } as any);
          setCurrentTenantId('demo-tenant');
          setAuthError(null);
          setLoading(false);
          
          return { success: true, user: demoUser };
        } else {
          const error = 'Invalid credentials. Use demo@example.com / demo123 for demo mode';
          setAuthError(error);
          return { 
            success: false, 
            error
          };
        }
      }

      const result = await authService.signIn(email, password);
      
      if (result.success && result.user) {
        // Let the auth state change listener handle the state update
        console.log('✅ Sign in successful');
        setAuthError(null);
      } else {
        setAuthError(result.error || 'Sign in failed');
      }
      
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      // If in demo mode, just clear the state
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        setUser(null);
        setSession(null);
        setCurrentTenantId(null);
        setAuthError(null);
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error && error.status !== 400) { // 400 error is expected if no session
        console.error('Sign out error:', error);
      }
      
      // Clear state regardless of error
      setUser(null);
      setSession(null);
      setCurrentTenantId(null);
      setAuthError(null);
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear state anyway
      setUser(null);
      setSession(null);
      setCurrentTenantId(null);
      setAuthError(null);
    }
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      const result = await authService.resetPassword(email);
      
      if (!result.success && result.error) {
        setAuthError(result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Password reset error in provider:', error);
      const errorMessage = 'Failed to send password reset email';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updatePassword = async (newPassword: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      const result = await authService.updatePassword(newPassword);
      
      if (!result.success && result.error) {
        setAuthError(result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Password update error in provider:', error);
      const errorMessage = 'Failed to update password';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const switchTenant = async (tenantId: string): Promise<boolean> => {
    if (!user) {
      setAuthError('No user logged in');
      return false;
    }

    try {
      setAuthError(null);
      const result = await tenantContextService.switchTenantContext(user.id, tenantId);
      if (result.success) {
        setCurrentTenantId(tenantId);
        return true;
      } else {
        setAuthError('Failed to switch tenant');
        return false;
      }
    } catch (error) {
      console.error('Tenant switch error:', error);
      setAuthError('An error occurred while switching tenant');
      return false;
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    currentTenantId,
    switchTenant,
    isAuthenticated: !!user,
    authError,
    clearAuthError
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
