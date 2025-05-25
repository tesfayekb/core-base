
import { useState, useEffect } from 'react';
import { rbacService } from '../services/rbac/rbacService';
import { useAuth } from '../contexts/AuthContext';

export interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook for checking permissions (updated to match RBACService signature)
 */
export function usePermission(
  action: string,
  resource: string,
  resourceId?: string
): UsePermissionResult {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  
  useEffect(() => {
    const checkPermission = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        if (!user) {
          setHasPermission(false);
          return;
        }

        const result = await rbacService.checkPermission(
          user.id,
          action,
          resource,
          resourceId
        );
        
        setHasPermission(result);
      } catch (err) {
        console.error('Permission check error:', err);
        setError('Failed to check permission');
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPermission();
  }, [user, action, resource, resourceId]);
  
  return { hasPermission, isLoading, error };
}

/**
 * Hook for checking multiple permissions
 */
export function useMultiplePermissions(
  permissions: Array<{ action: string; resource: string; resourceId?: string }>
): Record<string, UsePermissionResult> {
  const { user } = useAuth();
  const [results, setResults] = useState<Record<string, UsePermissionResult>>({});
  
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        const deniedResults: Record<string, UsePermissionResult> = {};
        permissions.forEach(perm => {
          const key = `${perm.action}:${perm.resource}${perm.resourceId ? `:${perm.resourceId}` : ''}`;
          deniedResults[key] = { hasPermission: false, isLoading: false };
        });
        setResults(deniedResults);
        return;
      }

      const newResults: Record<string, UsePermissionResult> = {};
      
      for (const perm of permissions) {
        const key = `${perm.action}:${perm.resource}${perm.resourceId ? `:${perm.resourceId}` : ''}`;
        
        try {
          const hasPermission = await rbacService.checkPermission(
            user.id,
            perm.action,
            perm.resource,
            perm.resourceId
          );
          
          newResults[key] = { hasPermission, isLoading: false };
        } catch (err) {
          newResults[key] = { 
            hasPermission: false, 
            isLoading: false, 
            error: 'Permission check failed' 
          };
        }
      }
      
      setResults(newResults);
    };
    
    checkPermissions();
  }, [user, permissions]);
  
  return results;
}

/**
 * Hook for checking if user can grant specific permissions
 */
export function useCanGrantPermission(
  targetUserId?: string,
  roleId?: string
): UsePermissionResult {
  const { user } = useAuth();
  const [canGrant, setCanGrant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  
  useEffect(() => {
    const checkGrantPermission = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        if (!user || !targetUserId || !roleId) {
          setCanGrant(false);
          return;
        }

        const result = await rbacService.assignRole(targetUserId, roleId);
        setCanGrant(result.success);
        
        if (!result.success && result.error) {
          setError(result.error);
        }
      } catch (err) {
        console.error('Grant permission check error:', err);
        setError('Failed to check grant permission');
        setCanGrant(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkGrantPermission();
  }, [user, targetUserId, roleId]);
  
  return { hasPermission: canGrant, isLoading, error };
}
