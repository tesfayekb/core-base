
import { useState, useEffect } from 'react';
import { rbacService } from '../services/rbac/rbacService';
import { useAuth } from '../contexts/AuthContext';

interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  error: Error | null;
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

  useEffect(() => {
    if (!user) {
      setHasPermission(false);
      setIsLoading(false);
      return;
    }

    const checkPermission = async () => {
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
    };

    checkPermission();
  }, [user, action, resource, resourceId, tenantId]);

  return { hasPermission, isLoading, error };
}
