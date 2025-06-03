
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { permissionService } from '@/services/database/permissionService';

export interface PermissionContext {
  tenantId?: string;
  resourceId?: string;
}

export function usePermission(action: string, resource: string, context?: PermissionContext) {
  const { user, currentTenantId } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await permissionService.checkPermission({
          userId: user.id,
          action,
          resource,
          resourceId: context?.resourceId,
          tenantId: context?.tenantId || currentTenantId || undefined
        });
        setHasPermission(result);
      } catch (error) {
        console.error('Permission check error:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [user, action, resource, context?.resourceId, context?.tenantId, currentTenantId]);

  return { hasPermission, loading };
}

export function usePermissions(checks: Array<{ action: string; resource: string; context?: PermissionContext }>) {
  const { user, currentTenantId } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setPermissions({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const permissionChecks = checks.map(({ action, resource, context }) => ({
          userId: user.id,
          action,
          resource,
          resourceId: context?.resourceId,
          tenantId: context?.tenantId || currentTenantId || undefined
        }));

        const results = await permissionService.batchCheckPermissions(permissionChecks);
        setPermissions(results);
      } catch (error) {
        console.error('Batch permission check error:', error);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [user, checks, currentTenantId]);

  return { permissions, loading };
}
