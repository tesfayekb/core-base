
// Permission Hook for UI Integration with Authentication Context
// Phase 1.4: RBAC Foundation - UI Integration

import { useState, useEffect } from 'react';
import { rbacService } from '../services/rbac/rbacService';
import { useAuth } from '../contexts/AuthContext';

export interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook for checking permissions in UI components
 * Uses authentication context for real user/tenant data
 */
export function usePermission(
  action: string,
  resource: string,
  resourceId?: string
): UsePermissionResult {
  const { user, tenantId } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  
  useEffect(() => {
    const checkPermission = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        // If no user is authenticated, deny permission
        if (!user) {
          setHasPermission(false);
          return;
        }

        const result = await rbacService.checkPermission(
          user.id,
          action,
          resource,
          resourceId,
          tenantId || undefined
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
  }, [user, tenantId, action, resource, resourceId]);
  
  return { hasPermission, isLoading, error };
}

/**
 * Hook for checking multiple permissions at once
 */
export function useMultiplePermissions(
  permissions: Array<{ action: string; resource: string; resourceId?: string }>
): Record<string, UsePermissionResult> {
  const { user, tenantId } = useAuth();
  const [results, setResults] = useState<Record<string, UsePermissionResult>>({});
  
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        // No user authenticated, deny all permissions
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
            perm.resourceId,
            tenantId || undefined
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
  }, [user, tenantId, permissions]);
  
  return results;
}
