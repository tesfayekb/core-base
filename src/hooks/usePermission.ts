import { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../services/rbac/rbacService';

interface UsePermissionResult {
  hasPermission: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<boolean>;
  assignRole: (assigneeId: string, roleId: string, assignmentTenantId: string) => Promise<{ success: boolean; error?: string }>;
}

export const usePermission = (
  action: string,
  resource: string,
  tenantId?: string,
  entityId?: string
) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const context = { tenantId, entityId };
        const result = await rbacService.checkPermission(
          'current-user-id', // In real app, get from auth context
          action,
          resource,
          context
        );
        
        setHasPermission(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Permission check failed');
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [action, resource, tenantId, entityId]);

  const refetch = useCallback(async () => {
    const context = { tenantId, entityId };
    try {
      const result = await rbacService.checkPermission(
        'current-user-id',
        action,
        resource,
        context
      );
      setHasPermission(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission check failed');
      return false;
    }
  }, [action, resource, tenantId, entityId]);

  const assignRole = useCallback(async (
    assigneeId: string,
    roleId: string,
    assignmentTenantId: string
  ) => {
    try {
      const result = await rbacService.assignRole(
        'current-user-id',
        assigneeId,
        roleId,
        assignmentTenantId
      );
      return result;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Role assignment failed');
    }
  }, []);

  return {
    hasPermission,
    loading,
    error,
    refetch,
    assignRole
  };
};
