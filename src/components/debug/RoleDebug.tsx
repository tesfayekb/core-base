import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/database';

export function RoleDebug() {
  const { user } = useAuth();

  const { data: userRoles, error: roleError } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('🔍 RoleDebug: Fetching roles for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          roles!user_roles_role_id_fkey (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('RoleDebug: Error fetching user roles:', error);
        return [];
      }

      console.log('📋 RoleDebug: Found roles:', data);
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!user) return null;

  return (
    <div className="p-4 bg-gray-100 rounded-lg text-xs">
      <h3 className="font-bold mb-2">Role Debug Info</h3>
      <p><strong>User:</strong> {user.email}</p>
      <p><strong>User ID:</strong> {user.id}</p>
      {roleError && (
        <p className="text-red-600"><strong>Error:</strong> {JSON.stringify(roleError)}</p>
      )}
      <p><strong>Roles:</strong></p>
      <ul className="ml-4">
        {userRoles?.map((ur: any) => (
          <li key={ur.id}>
            {ur.roles?.name} (tenant: {ur.tenant_id || 'system-wide'})
          </li>
        )) || <li>Loading...</li>}
      </ul>
      <p className="mt-2"><strong>Total roles found:</strong> {userRoles?.length || 0}</p>
    </div>
  );
}
