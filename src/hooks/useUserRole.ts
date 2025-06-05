import { useState, useEffect } from 'react';
import { supabase } from '@/services/database';
import { useAuth } from '@/components/auth/AuthProvider';

export function useUserRole() {
  const { user, currentTenantId } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        console.log('🔍 useUserRole: Fetching role for user:', user.id);
        
        const { data: allRoles, error: allRolesError } = await supabase
          .from('user_roles')
          .select(`
            id,
            tenant_id,
            roles!user_roles_role_id_fkey (
              name,
              is_system_role
            )
          `)
          .eq('user_id', user.id);

        if (allRolesError) {
          console.error('useUserRole: Error fetching all user roles:', allRolesError);
          setRole('User');
          setLoading(false);
          return;
        }

        console.log('📋 useUserRole: All roles for user:', allRoles);

        const superAdminRole = allRoles?.find(ur => {
          console.log('🔍 useUserRole: Checking role:', ur);
          return ur.roles?.name === 'SuperAdmin' && ur.tenant_id === null;
        });

        if (superAdminRole) {
          console.log('✅ useUserRole: Found SuperAdmin role:', superAdminRole);
          setRole('SuperAdmin');
          setLoading(false);
          return;
        }

        const anySuperAdminRole = allRoles?.find(ur => 
          ur.roles?.name === 'SuperAdmin'
        );

        if (anySuperAdminRole) {
          console.log('✅ useUserRole: Found SuperAdmin role (any tenant):', anySuperAdminRole);
          setRole('SuperAdmin');
          setLoading(false);
          return;
        }

        const tenantRole = allRoles?.find(ur => 
          ur.tenant_id === currentTenantId
        );

        if (tenantRole?.roles) {
          console.log('✅ useUserRole: Found tenant role:', tenantRole);
          setRole(tenantRole.roles.name);
        } else {
          console.log('🔄 useUserRole: No specific role found, defaulting to User');
          setRole('User');
        }
      } catch (error) {
        console.error('useUserRole: Error in useUserRole:', error);
        setRole('User');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user, currentTenantId]);

  return { role, loading };
}
