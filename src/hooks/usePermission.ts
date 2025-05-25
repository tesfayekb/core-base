
// Permission Hook for UI Integration with Enhanced Dependency Resolution
// Phase 1.4: RBAC Foundation - Complete UI Integration

import { useState, useEffect } from 'react';
import { rbacService } from '../services/rbac/rbacService';
import { useAuth } from '../contexts/AuthContext';

export interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook for checking permissions with full dependency resolution
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

        // Use enhanced permission checking with dependency resolution
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
 * Hook for checking multiple permissions with enhanced dependency resolution
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
          // Enhanced permission checking with full dependency resolution
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

/**
 * Hook for checking if user can grant specific permissions
 */
export function useCanGrantPermission(
  targetUserId?: string,
  permission?: string
): UsePermissionResult {
  const { user, tenantId } = useAuth();
  const [canGrant, setCanGrant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  
  useEffect(() => {
    const checkGrantPermission = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        if (!user || !targetUserId || !permission || !tenantId) {
          setCanGrant(false);
          return;
        }

        // Check using enhanced entity boundary validation
        const result = await rbacService.assignRole(user.id, targetUserId, permission, tenantId);
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
  }, [user, tenantId, targetUserId, permission]);
  
  return { hasPermission: canGrant, isLoading, error };
}
