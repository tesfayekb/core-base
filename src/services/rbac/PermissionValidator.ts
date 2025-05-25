
import { supabase } from '../database/connection';
import { EntityBoundaryValidator } from './entityBoundaries';
import { PermissionCache } from './PermissionCache';

export interface PermissionContext {
  tenantId?: string;
  entityId?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export class PermissionValidator {
  constructor(private cache: PermissionCache) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          roles!inner (
            name
          )
        `)
        .eq('user_id', userId)
        .eq('roles.name', 'SuperAdmin')
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('SuperAdmin check failed:', error);
      return false;
    }
  }

  async hasDirectPermission(
    userId: string,
    action: string,
    resource: string,
    context: PermissionContext
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: userId,
        p_action: action,
        p_resource: resource,
        p_resource_id: context.resourceId || null
      });

      if (error) {
        console.error('Direct permission check error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Direct permission check failed:', error);
      return false;
    }
  }

  async validateEntityBoundary(
    userId: string,
    context: PermissionContext
  ): Promise<boolean> {
    if (!context.entityId && !context.tenantId) {
      return true;
    }

    const boundaryKey = `${userId}:${context.entityId || context.tenantId}`;
    const cached = this.cache.getEntityBoundaryCache(boundaryKey);
    
    if (cached) {
      return cached.valid;
    }

    try {
      const isValid = await EntityBoundaryValidator.validateEntityBoundary(
        {
          userId,
          entityId: context.entityId || context.tenantId || '',
          operation: 'permission_check'
        },
        async (uid: string, permission: string) => {
          const [action, resource] = permission.split(':');
          return this.hasDirectPermission(uid, action, resource, context);
        }
      );

      this.cache.setEntityBoundaryCache(boundaryKey, isValid);
      return isValid;
    } catch (error) {
      console.error('Entity boundary validation failed:', error);
      return false;
    }
  }
}
