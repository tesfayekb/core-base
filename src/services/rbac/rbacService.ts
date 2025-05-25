
// RBAC Service Implementation with Database Integration
// Phase 1.4: RBAC Foundation with Database Queries

import { Role, Permission, UserRole, PermissionCheck } from '../../types/rbac';
import { PermissionDependencyResolver } from './permissionDependencies';
import { EntityBoundaryValidator } from './entityBoundaries';
import { supabase } from '../database';

export class RBACService {
  private static instance: RBACService;
  private permissionCache = new Map<string, boolean>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  /**
   * Check if user has permission with comprehensive dependency resolution
   */
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    tenantId?: string
  ): Promise<boolean> {
    try {
      const cacheKey = `${userId}-${action}-${resource}-${resourceId || 'null'}-${tenantId || 'null'}`;
      
      // Check cache first
      if (this.permissionCache.has(cacheKey)) {
        return this.permissionCache.get(cacheKey)!;
      }

      // Create permission checker function for dependencies
      const hasExplicitPermission = async (checkAction: string, checkResource: string, checkResourceId?: string) => {
        return this.hasDirectPermission(userId, checkAction, checkResource, checkResourceId, tenantId);
      };
      
      // Use enhanced dependency resolver with all implications
      const result = await PermissionDependencyResolver.checkPermissionWithDependencies(
        hasExplicitPermission,
        action,
        resource,
        resourceId
      );

      // Cache the result
      this.permissionCache.set(cacheKey, result);
      setTimeout(() => this.permissionCache.delete(cacheKey), this.cacheTimeout);

      return result;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Direct permission check with database queries
   */
  private async hasDirectPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    tenantId?: string
  ): Promise<boolean> {
    try {
      // Check if user is SuperAdmin first (bypass all checks)
      if (await this.isSuperAdmin(userId)) {
        return true;
      }

      // Use Supabase RPC function to check permission
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: userId,
        p_action: action,
        p_resource: resource,
        p_resource_id: resourceId || null,
        p_tenant_id: tenantId || null
      });

      if (error) {
        console.error('Database permission check error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Direct permission check failed:', error);
      return false;
    }
  }

  /**
   * Check if user is SuperAdmin using database
   */
  private async isSuperAdmin(userId: string): Promise<boolean> {
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

  /**
   * Get user roles with database queries
   */
  async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
    try {
      let query = supabase
        .from('user_roles')
        .select(`
          roles (
            id,
            tenant_id,
            name,
            description,
            is_system_role,
            metadata,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (tenantId) {
        query = query.eq('roles.tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get user roles:', error);
        return [];
      }

      // Transform the nested data structure
      const roles = data?.map(item => item.roles).filter(Boolean) || [];
      return roles.map(role => ({
        ...role,
        permissions: [] // Will be populated separately if needed
      }));
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return [];
    }
  }

  /**
   * Assign role to user with comprehensive entity boundary validation
   */
  async assignRole(
    assignerId: string,
    assigneeId: string,
    roleId: string,
    tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Enhanced entity boundary validation
      const boundaryCheck = await EntityBoundaryValidator.validateEntityBoundary(
        {
          userId: assignerId,
          entityId: tenantId,
          operation: 'assign_role',
          targetUserId: assigneeId
        },
        (userId, permission) => this.hasDirectPermission(userId, permission, 'roles')
      );

      if (!boundaryCheck) {
        return { success: false, error: 'Entity boundary violation' };
      }

      // Check if assigner can grant permissions
      const permissionGrantCheck = await EntityBoundaryValidator.canGrantPermission(
        {
          grantor: { userId: assignerId, entityId: tenantId },
          grantee: { userId: assigneeId, entityId: tenantId },
          permission: `Assign:roles:${roleId}`
        },
        (userId, permission) => this.hasDirectPermission(userId, permission, 'roles')
      );

      if (!permissionGrantCheck.valid) {
        return { success: false, error: permissionGrantCheck.reason };
      }

      // Insert role assignment
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: assigneeId,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_by: assignerId
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Clear permission cache for affected user
      this.clearUserCache(assigneeId);

      return { success: true };
    } catch (error) {
      console.error('Role assignment failed:', error);
      return { success: false, error: 'Role assignment failed' };
    }
  }

  /**
   * Get effective permissions for user
   */
  async getUserPermissions(userId: string, tenantId?: string): Promise<Permission[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId,
        p_tenant_id: tenantId || null
      });

      if (error) {
        console.error('Failed to get user permissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }

  /**
   * Clear permission cache for a user
   */
  private clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.permissionCache.keys())
      .filter(key => key.startsWith(`${userId}-`));
    
    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  /**
   * Clear all permission cache
   */
  clearCache(): void {
    this.permissionCache.clear();
  }
}

export const rbacService = RBACService.getInstance();
