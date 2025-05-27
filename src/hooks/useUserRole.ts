import { useState, useEffect } from 'react';
import { supabase } from '@/services/database';
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user, currentTenantId } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentTenantId) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select(`
            roles (
              name,
              is_system_role
            )
          `)
          .eq('user_id', user.id)
          .eq('tenant_id', currentTenantId)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('User');
        } else if (data?.roles) {
          setRole(data.roles.name);
        } else {
          setRole('User');
        }
      } catch (error) {
        console.error('Error in useUserRole:', error);
        setRole('User');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user, currentTenantId]);

  return { role, loading };
}
