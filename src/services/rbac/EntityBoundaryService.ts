
import { EntityBoundaryValidator, EntityBoundaryContext, PermissionGrantContext } from './EntityBoundaryValidator';
import { enhancedPermissionResolver } from './EnhancedPermissionResolver';
import { supabase } from '../database/connection';

export interface EntityContext {
  entityId: string;
  entityType: 'tenant' | 'organization' | 'department';
  parentEntityId?: string;
}

export interface CrossEntityRequest {
  sourceEntityId: string;
  targetEntityId: string;
  operation: string;
  resourceType: string;
  resourceId?: string;
}

export class EntityBoundaryService {
  private static instance: EntityBoundaryService;

  static getInstance(): EntityBoundaryService {
    if (!EntityBoundaryService.instance) {
      EntityBoundaryService.instance = new EntityBoundaryService();
    }
    return EntityBoundaryService.instance;
  }

  /**
   * Enforce entity boundary for any operation
   */
  async enforceEntityBoundary(
    userId: string,
    operation: string,
    resourceType: string,
    resourceId?: string,
    targetEntityId?: string
  ): Promise<{ allowed: boolean; reason?: string; entityId?: string }> {
    try {
      // Get user's current entity context
      const userEntityId = await this.getUserEntityContext(userId);
      
      if (!userEntityId) {
        return { allowed: false, reason: 'User has no entity context' };
      }

      // If no target entity specified, use user's entity
      const effectiveEntityId = targetEntityId || userEntityId;

      // Check if user can operate within the target entity
      const boundaryContext: EntityBoundaryContext = {
        userId,
        entityId: effectiveEntityId,
        operation,
        resourceId
      };

      const isValid = await EntityBoundaryValidator.validateEntityBoundary(
        boundaryContext,
        async (uid: string, permission: string) => {
          const [action, resource] = permission.split(':');
          const result = await enhancedPermissionResolver.resolvePermission(
            uid,
            action,
            resource,
            { entityId: effectiveEntityId, resourceId }
          );
          return result.granted;
        }
      );

      if (!isValid) {
        return { 
          allowed: false, 
          reason: 'Entity boundary violation', 
          entityId: effectiveEntityId 
        };
      }

      // Additional check for cross-entity operations
      if (targetEntityId && targetEntityId !== userEntityId) {
        const canCrossEntities = await this.canPerformCrossEntityOperation({
          sourceEntityId: userEntityId,
          targetEntityId,
          operation,
          resourceType,
          resourceId
        }, userId);

        if (!canCrossEntities) {
          return { 
            allowed: false, 
            reason: 'Cross-entity operation not authorized',
            entityId: effectiveEntityId 
          };
        }
      }

      return { allowed: true, entityId: effectiveEntityId };
    } catch (error) {
      console.error('Entity boundary enforcement failed:', error);
      return { allowed: false, reason: 'Entity boundary check failed' };
    }
  }

  /**
   * Validate permission grant across entity boundaries
   */
  async validatePermissionGrant(
    grantorId: string,
    granteeId: string,
    permission: string,
    resourceId?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const grantorEntityId = await this.getUserEntityContext(grantorId);
      const granteeEntityId = await this.getUserEntityContext(granteeId);

      if (!grantorEntityId || !granteeEntityId) {
        return { valid: false, reason: 'Invalid entity context for permission grant' };
      }

      const grantContext: PermissionGrantContext = {
        grantor: { userId: grantorId, entityId: grantorEntityId },
        grantee: { userId: granteeId, entityId: granteeEntityId },
        permission,
        resourceId
      };

      return await EntityBoundaryValidator.canGrantPermission(
        grantContext,
        async (uid: string, perm: string) => {
          const [action, resource] = perm.split(':');
          const result = await enhancedPermissionResolver.resolvePermission(
            uid,
            action,
            resource,
            { entityId: grantorEntityId, resourceId }
          );
          return result.granted;
        }
      );
    } catch (error) {
      console.error('Permission grant validation failed:', error);
      return { valid: false, reason: 'Permission grant validation failed' };
    }
  }

  /**
   * Check if user can perform cross-entity operations
   */
  private async canPerformCrossEntityOperation(
    request: CrossEntityRequest,
    userId: string
  ): Promise<boolean> {
    // Check for explicit cross-entity permissions
    const result = await enhancedPermissionResolver.resolvePermission(
      userId,
      'cross_entity_access',
      request.resourceType,
      { 
        entityId: request.sourceEntityId,
        metadata: {
          targetEntityId: request.targetEntityId,
          operation: request.operation
        }
      }
    );

    return result.granted;
  }

  /**
   * Get user's current entity context
   */
  private async getUserEntityContext(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_entities')
        .select('entity_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // Fallback to tenant context
        const { data: tenantData } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .single();

        return tenantData?.tenant_id || null;
      }

      return data.entity_id;
    } catch (error) {
      console.error('Failed to get user entity context:', error);
      return null;
    }
  }

  /**
   * Set user's entity context
   */
  async setUserEntityContext(userId: string, entityId: string): Promise<boolean> {
    try {
      // Deactivate current entity context
      await supabase
        .from('user_entities')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Set new entity context
      const { error } = await supabase
        .from('user_entities')
        .upsert({
          user_id: userId,
          entity_id: entityId,
          is_active: true,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to set entity context:', error);
        return false;
      }

      // Clear permission cache for user
      enhancedPermissionResolver.invalidateUserCache(userId);
      EntityBoundaryValidator.clearCache(userId);

      return true;
    } catch (error) {
      console.error('Failed to set user entity context:', error);
      return false;
    }
  }

  /**
   * Get entity boundaries for a user
   */
  async getUserEntityBoundaries(userId: string): Promise<EntityContext[]> {
    try {
      const { data, error } = await supabase
        .from('user_entities')
        .select(`
          entity_id,
          entities:entity_id (
            id,
            name,
            type,
            parent_id
          )
        `)
        .eq('user_id', userId);

      if (error || !data) {
        return [];
      }

      return data.map(item => ({
        entityId: item.entity_id,
        entityType: (item.entities as any)?.type as 'tenant' | 'organization' | 'department' || 'tenant',
        parentEntityId: (item.entities as any)?.parent_id
      }));
    } catch (error) {
      console.error('Failed to get user entity boundaries:', error);
      return [];
    }
  }
}

export const entityBoundaryService = EntityBoundaryService.getInstance();
