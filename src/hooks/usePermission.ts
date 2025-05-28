
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { rbacService } from '@/services/rbac/rbacService';

export function usePermission(action: string, resource: string, resourceId?: string) {
  const { user, currentTenantId } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = async () => {
    if (!user || !currentTenantId) {
      setHasPermission(false);
      setIsLoading(false);
      return false;
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
        return true;
      }

      // Check for manage:all permission (covers all actions)
      const userPermissions = await rbacService.getUserPermissions(user.id, currentTenantId);
      const hasManageAll = userPermissions.some(perm => 
        perm.action === 'manage' && perm.resource === 'all'
      );

      if (hasManageAll) {
        setHasPermission(true);
        setIsLoading(false);
        return true;
      }

      // Check specific permission - fix the context parameter
      const hasSpecificPermission = await rbacService.checkPermission(
        user.id,
        action,
        resource,
        { tenantId: currentTenantId, resourceId }
      );

      setHasPermission(hasSpecificPermission);
      return hasSpecificPermission;
    } catch (err) {
      console.error('Permission check failed:', err);
      setError(err instanceof Error ? err.message : 'Permission check failed');
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkPermission();
  }, [user, currentTenantId, action, resource, resourceId]);

  // Add refetch method
  const refetch = async () => {
    return await checkPermission();
  };

  return { hasPermission, isLoading, error, refetch };
}
