
import { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../services/rbac/rbacService';
import { useStandardErrorHandler } from './useStandardErrorHandler';

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { handleAsyncOperation } = useStandardErrorHandler();

  useEffect(() => {
    const checkBoundaryPermission = async () => {
      if (!entityId || !entityType) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      const result = await handleAsyncOperation(
        async () => {
          const context = { tenantId, entityId };
          return await rbacService.checkPermission(
            'current-user-id',
            action,
            entityType,
            context
          );
        },
        'entity_boundary_permission',
        { 
          showToast: false, // Don't show toast for routine boundary checks
          fallbackValue: false 
        }
      );
      
      if (result !== undefined) {
        setHasPermission(result);
      } else {
        setError('Boundary permission check failed');
        setHasPermission(false);
      }
      
      setIsLoading(false);
    };

    checkBoundaryPermission();
  }, [entityType, entityId, action, tenantId, handleAsyncOperation]);

  const validateBoundary = useCallback(async (
    targetEntityId: string,
    targetAction: string
  ) => {
    return await handleAsyncOperation(
      async () => {
        const context = { tenantId, entityId: targetEntityId };
        return await rbacService.checkPermission(
          'current-user-id',
          targetAction,
          entityType,
          context
        );
      },
      'boundary_validation',
      { showToast: true, fallbackValue: false }
    );
  }, [entityType, tenantId, handleAsyncOperation]);

  return {
    hasPermission,
    isLoading,
    error,
    validateBoundary,
    entityId,
    canCrossEntities: false
  };
};
