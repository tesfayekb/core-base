import { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../services/rbac/rbacService';

interface PermissionContext {
  tenantId?: string;
  entityId?: string;
}

export const useEntityBoundaryPermission = (
  entityType: string,
  entityId: string,
  action: string,
  tenantId?: string
) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkBoundaryPermission = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const context = { tenantId, entityId };
        const result = await rbacService.checkPermission(
          'current-user-id',
          action,
          entityType,
          context
        );
        
        setHasPermission(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Boundary permission check failed');
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    if (entityId && entityType) {
      checkBoundaryPermission();
    }
  }, [entityType, entityId, action, tenantId]);

  const validateBoundary = useCallback(async (
    targetEntityId: string,
    targetAction: string
  ) => {
    try {
      const context = { tenantId, entityId: targetEntityId };
      const result = await rbacService.checkPermission(
        'current-user-id',
        targetAction,
        entityType,
        context
      );
      return result;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Boundary validation failed');
    }
  }, [entityType, tenantId]);

  return {
    hasPermission,
    loading,
    error,
    validateBoundary
  };
};
