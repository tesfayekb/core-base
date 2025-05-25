
import { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../services/rbac/rbacService';
import { useAuth } from '../contexts/AuthContext';

interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePermission(
  action: string,
  resource: string,
  resourceId?: string
): UsePermissionResult {
  const { user, tenantId } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkPermission = useCallback(async () => {
    if (!user) {
      setHasPermission(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await rbacService.checkPermission(
        user.id,
        action,
        resource,
        { tenantId, resourceId }
      );
      
      setHasPermission(result);
    } catch (err) {
      setError(err as Error);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, action, resource, resourceId, tenantId]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const refetch = useCallback(() => {
    checkPermission();
  }, [checkPermission]);

  return { hasPermission, isLoading, error, refetch };
}
