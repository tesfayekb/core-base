
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { rbacService } from '@/services/rbac/rbacService';

export function usePermission(action: string, resource: string, resourceId?: string) {
  const { user, currentTenantId } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user || !currentTenantId) {
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Check if user is superadmin first
        const userRoles = await rbacService.getUserRoles(user.id, currentTenantId);
        const isSuperAdmin = userRoles.some(role => 
          role.name === 'SuperAdmin' || role.name === 'superadmin' || role.name === 'admin'
        );

        // SuperAdmin has access to everything
        if (isSuperAdmin) {
          setHasPermission(true);
          setIsLoading(false);
          return;
        }

        // Get user permissions and check for specific permission or "manage:all"
        const userPermissions = await rbacService.getUserPermissions(user.id, currentTenantId);
        
        // Check for exact permission match
        const hasExactPermission = userPermissions.some(perm => 
          perm.action === action && perm.resource === resource
        );

        // Check for "manage:all" permission which grants everything
        const hasManageAll = userPermissions.some(perm => 
          perm.action === 'manage' && perm.resource === 'all'
        );

        // Check for Administrator role which should have all permissions
        const isAdministrator = userRoles.some(role => 
          role.name === 'Administrator' || role.name === 'Admin'
        );

        setHasPermission(hasExactPermission || hasManageAll || isAdministrator);
      } catch (err) {
        console.error('Permission check failed:', err);
        setError(err instanceof Error ? err.message : 'Permission check failed');
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [user, currentTenantId, action, resource, resourceId]);

  return { hasPermission, isLoading, error };
}
