
import React, { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/services/database';
import { useQuery } from '@tanstack/react-query';

interface PermissionBoundaryProps {
  action: string;
  resource: string;
  resourceId?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionBoundary({ 
  action, 
  resource, 
  resourceId, 
  children, 
  fallback 
}: PermissionBoundaryProps) {
  const { user, currentTenantId } = useAuth();
  
  // Check if user is SuperAdmin
  const { data: isSuperAdmin = false } = useQuery({
    queryKey: ['isSuperAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      console.log('🔍 PermissionBoundary: Checking SuperAdmin status for user:', user.id);
      
      const { data: systemRoleData, error: systemError } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          roles!user_roles_role_id_fkey (
            name
          )
        `)
        .eq('user_id', user.id)
        .is('tenant_id', null)
        .eq('roles.name', 'SuperAdmin');
      
      if (!systemError && systemRoleData && systemRoleData.length > 0) {
        console.log('🔐 PermissionBoundary: Found system-wide SuperAdmin role:', systemRoleData);
        return true;
      }
      
      const { data: allRoleData, error: allError } = await supabase
        .from('user_roles')
        .select(`
          id,
          tenant_id,
          roles!user_roles_role_id_fkey (
            name
          )
        `)
        .eq('user_id', user.id);
      
      if (allError) {
        console.error('PermissionBoundary: Error checking all user roles:', allError);
        return false;
      }
      
      if (!allRoleData) return false;
      
      const isSuperAdmin = allRoleData.some((ur: any) => ur.roles?.name === 'SuperAdmin');
      console.log(`🔐 PermissionBoundary: SuperAdmin check for ${user.email}: ${isSuperAdmin}`, allRoleData);
      
      return isSuperAdmin;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { hasPermission, loading } = usePermission(action, resource, {
    tenantId: currentTenantId,
    resourceId
  });

  // SuperAdmin has all permissions
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Checking permissions...</div>
      </div>
    );
  }

  if (!hasPermission) {
    return <>{fallback || <div className="text-sm text-muted-foreground">Access denied</div>}</>;
  }

  return <>{children}</>;
}
