
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { rbacService } from '@/services/rbac/rbacService';

interface PermissionContext {
  userId: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
}

export function usePermission(action: string, resource: string, resourceId?: string) {
  const { user, currentTenantId } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!user || !currentTenantId) {
      setHasPermission(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if user is superadmin or administrator first
      const userRoles = await rbacService.getUserRoles(user.id, currentTenantId);
      const isAdminUser = userRoles.some(role => 
        role.name === 'SuperAdmin' || 
        role.name === 'superadmin' || 
        role.name === 'Administrator' || 
        role.name === 'admin'
      );

      // Admin users have access to everything
      if (isAdminUser) {
        setHasPermission(true);
        setIsLoading(false);
        return;
      }

      // Check for manage:all permission (covers all actions)
      const userPermissions = await rbacService.getUserPermissions(user.id, currentTenantId);
      const hasManageAll = userPermissions.some(perm => 
        perm.action === 'manage' && perm.resource === 'all'
      );

      if (hasManageAll) {
        setHasPermission(true);
        setIsLoading(false);
        return;
      }

      // Check specific permission
      const hasSpecificPermission = await rbacService.checkPermission(
        user.id,
        action,
        resource,
        resourceId
      );

      setHasPermission(hasSpecificPermission);
    } catch (err) {
      console.error('Permission check failed:', err);
      setError(err instanceof Error ? err.message : 'Permission check failed');
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [user, currentTenantId, action, resource, resourceId]);

  return { hasPermission, isLoading, error, refetch };
}
