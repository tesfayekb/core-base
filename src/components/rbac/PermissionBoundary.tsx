
import React, { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
      
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select(`
          roles!user_roles_role_id_fkey(
            name
          )
        `)
        .eq('user_id', user.id);
      
      if (error || !roleData) return false;
      
      return roleData.some((ur: any) => ur.roles?.name === 'SuperAdmin');
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
