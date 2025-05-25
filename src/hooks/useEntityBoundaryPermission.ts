
import { useState, useEffect } from 'react';
import { rbacService } from '../services/rbac/rbacService';
import { entityBoundaryService } from '../services/rbac/EntityBoundaryService';
import { useAuth } from '../contexts/AuthContext';

export interface UseEntityPermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  error?: string;
  entityId?: string;
  canCrossEntities: boolean;
}

/**
 * Enhanced permission hook with entity boundary enforcement
 */
export function useEntityBoundaryPermission(
  action: string,
  resource: string,
  resourceId?: string,
  targetEntityId?: string
): UseEntityPermissionResult {
  const { user, tenantId } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [entityId, setEntityId] = useState<string>();
  const [canCrossEntities, setCanCrossEntities] = useState(false);
  
  useEffect(() => {
    const checkPermissionWithBoundaries = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        if (!user) {
          setHasPermission(false);
          setCanCrossEntities(false);
          return;
        }

        // Check permission with entity boundary enforcement
        const permission = await rbacService.checkPermission(
          user.id,
          action,
          resource,
          resourceId,
          targetEntityId || tenantId || undefined
        );
        
        setHasPermission(permission);

        // Get user's entity boundaries
        const boundaries = await entityBoundaryService.getUserEntityBoundaries(user.id);
        setCanCrossEntities(boundaries.length > 1);
        
        // Set effective entity ID
        if (boundaries.length > 0) {
          setEntityId(targetEntityId || boundaries[0].entityId);
        }
        
      } catch (err) {
        console.error('Entity boundary permission check error:', err);
        setError('Failed to check permission with entity boundaries');
        setHasPermission(false);
        setCanCrossEntities(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPermissionWithBoundaries();
  }, [user, tenantId, action, resource, resourceId, targetEntityId]);
  
  return { 
    hasPermission, 
    isLoading, 
    error, 
    entityId,
    canCrossEntities 
  };
}

/**
 * Hook for checking if user can perform cross-entity operations
 */
export function useCrossEntityPermission(
  action: string,
  resource: string,
  sourceEntityId?: string,
  targetEntityId?: string
): UseEntityPermissionResult {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  
  useEffect(() => {
    const checkCrossEntityPermission = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        if (!user || !sourceEntityId || !targetEntityId) {
          setHasPermission(false);
          return;
        }

        // Check cross-entity permission
        const permission = await rbacService.checkPermission(
          user.id,
          'cross_entity_access',
          resource,
          undefined,
          sourceEntityId
        );
        
        setHasPermission(permission);
        
      } catch (err) {
        console.error('Cross-entity permission check error:', err);
        setError('Failed to check cross-entity permission');
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCrossEntityPermission();
  }, [user, action, resource, sourceEntityId, targetEntityId]);
  
  return { 
    hasPermission, 
    isLoading, 
    error, 
    entityId: targetEntityId,
    canCrossEntities: true 
  };
}
