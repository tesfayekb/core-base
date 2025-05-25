
// Permission Hook for UI Integration
// Phase 1.4: RBAC Foundation - UI Integration

import { useState, useEffect } from 'react';
import { BasicRBACService } from '../services/rbac/basicRbacService';

const rbacService = new BasicRBACService();

export interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook for checking permissions in UI components
 * Follows UI integration patterns from documentation
 */
export function usePermission(
  action: string,
  resource: string,
  resourceId?: string
): UsePermissionResult {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  
  useEffect(() => {
    const checkPermission = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        // For now, use placeholder user ID
        // In real implementation, this would come from auth context
        const userId = 'current-user-id';
        const tenantId = 'current-tenant-id';
        
        const result = await rbacService.checkPermission(
          userId,
          action,
          resource,
          resourceId,
          tenantId
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
  }, [action, resource, resourceId]);
  
  return { hasPermission, isLoading, error };
}

/**
 * Hook for checking multiple permissions at once
 */
export function useMultiplePermissions(
  permissions: Array<{ action: string; resource: string; resourceId?: string }>
): Record<string, UsePermissionResult> {
  const [results, setResults] = useState<Record<string, UsePermissionResult>>({});
  
  useEffect(() => {
    const checkPermissions = async () => {
      const newResults: Record<string, UsePermissionResult> = {};
      
      for (const perm of permissions) {
        const key = `${perm.action}:${perm.resource}${perm.resourceId ? `:${perm.resourceId}` : ''}`;
        
        try {
          const userId = 'current-user-id';
          const tenantId = 'current-tenant-id';
          
          const hasPermission = await rbacService.checkPermission(
            userId,
            perm.action,
            perm.resource,
            perm.resourceId,
            tenantId
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
  }, [permissions]);
  
  return results;
}
