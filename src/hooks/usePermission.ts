
import { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../services/rbac/rbacService';
import { useStandardErrorHandler } from './useStandardErrorHandler';

interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { handleError, handleAsyncOperation } = useStandardErrorHandler();

  useEffect(() => {
    const checkPermission = async () => {
      setIsLoading(true);
      setError(null);
      
      const result = await handleAsyncOperation(
        async () => {
          const context = { tenantId, entityId };
          return await rbacService.checkPermission(
            'current-user-id',
            action,
            resource,
            context
          );
        },
        'permission_check',
        { 
          showToast: false, // Don't show toast for routine permission checks
          fallbackValue: false 
        }
      );
      
      if (result !== undefined) {
        setHasPermission(result);
      } else {
        setError('Permission check failed');
        setHasPermission(false);
      }
      
      setIsLoading(false);
    };

    checkPermission();
  }, [action, resource, tenantId, entityId, handleAsyncOperation]);

  const refetch = useCallback(async () => {
    const context = { tenantId, entityId };
    
    const result = await handleAsyncOperation(
      async () => {
        return await rbacService.checkPermission(
          'current-user-id',
          action,
          resource,
          context
        );
      },
      'permission_refetch',
      { showToast: true, fallbackValue: false }
    );
    
    if (result !== undefined) {
      setHasPermission(result);
      setError(null);
      return result;
    } else {
      setError('Permission check failed');
      return false;
    }
  }, [action, resource, tenantId, entityId, handleAsyncOperation]);

  const assignRole = useCallback(async (
    assigneeId: string,
    roleId: string,
    assignmentTenantId: string
  ) => {
    const result = await handleAsyncOperation(
      async () => {
        return await rbacService.assignRole(
          'current-user-id',
          assigneeId,
          roleId,
          assignmentTenantId
        );
      },
      'role_assignment',
      { showToast: true }
    );
    
    if (result) {
      return result;
    } else {
      return { success: false, error: 'Role assignment failed' };
    }
  }, [handleAsyncOperation]);

  return {
    hasPermission,
    isLoading,
    error,
    refetch,
    assignRole
  };
};
