

// RBAC Service - Direct Permission Assignment Model
// Version: 1.0.0
// Phase 1.4: RBAC Foundation

import { supabase } from '@/services/database/connection';
import { 
  PermissionCheck, 
  EffectivePermission, 
  Role, 
  UserRole, 
  Permission,
  RoleAssignmentRequest,
  SYSTEM_ROLES 
} from '@/types/rbac';

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
   * Check if user has specific permission using direct assignment model
   */
  async checkPermission(check: PermissionCheck): Promise<boolean> {
    try {
      // Create cache key
      const cacheKey = `${check.userId}-${check.tenantId || 'global'}-${check.action}-${check.resource}-${check.resourceId || 'null'}`;
      
      // Check cache first
      if (this.permissionCache.has(cacheKey)) {
        return this.permissionCache.get(cacheKey)!;
      }

      // Check for SuperAdmin status (bypasses all permission checks)
      const isSuperAdmin = await this.isUserSuperAdmin(check.userId);
      if (isSuperAdmin) {
        this.permissionCache.set(cacheKey, true);
        return true;
      }

      // Get current tenant context if not provided
      const tenantId = check.tenantId || await this.getCurrentTenantContext(check.userId);
      if (!tenantId) {
        this.permissionCache.set(cacheKey, false);
        return false;
      }

      // Check permission through database function
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: check.userId,
        p_action: check.action,
        p_resource: check.resource,
        p_resource_id: check.resourceId || null,
        p_tenant_id: tenantId
      });

      if (error) {
        console.error('Permission check error:', error);
        return false;
      }

      const hasPermission = !!data;
      
      // Cache result with timeout
      this.permissionCache.set(cacheKey, hasPermission);
      setTimeout(() => {
        this.permissionCache.delete(cacheKey);
      }, this.cacheTimeout);

      return hasPermission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get user's effective permissions (union of all directly assigned role permissions)
   */
  async getUserPermissions(userId: string, tenantId?: string): Promise<EffectivePermission[]> {
    try {
      const effectiveTenantId = tenantId || await this.getCurrentTenantContext(userId);
      if (!effectiveTenantId) {
        return [];
      }

      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId,
        p_tenant_id: effectiveTenantId
      });

      if (error) {
        console.error('Get user permissions error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get user permissions failed:', error);
      return [];
    }
  }

  /**
   * Assign role to user (direct assignment)
   */
  async assignRole(request: RoleAssignmentRequest): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: request.userId,
          role_id: request.roleId,
          tenant_id: request.tenantId,
          assigned_by: request.assignedBy,
          expires_at: request.expiresAt
        });

      if (error) {
        console.error('Role assignment error:', error);
        return false;
      }

      // Clear permission cache for user
      this.clearUserPermissionCache(request.userId);
      
      return true;
    } catch (error) {
      console.error('Role assignment failed:', error);
      return false;
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string, tenantId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { error } = await query;

      if (error) {
        console.error('Role removal error:', error);
        return false;
      }

      // Clear permission cache for user
      this.clearUserPermissionCache(userId);
      
      return true;
    } catch (error) {
      console.error('Role removal failed:', error);
      return false;
    }
  }

  /**
   * Get user's directly assigned roles
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
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Get user roles error:', error);
        return [];
      }

      // Fix: Properly extract roles from the nested structure
      // Each item in data has a 'roles' property containing the role object
      return data?.map(item => item.roles).filter((role): role is Role => role !== null) || [];
    } catch (error) {
      console.error('Get user roles failed:', error);
      return [];
    }
  }

  /**
   * Check if user is SuperAdmin
   */
  private async isUserSuperAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          roles!inner (
            name,
            is_system_role
          )
        `)
        .eq('user_id', userId)
        .eq('roles.name', SYSTEM_ROLES.SUPER_ADMIN)
        .eq('roles.is_system_role', true);

      if (error) {
        console.error('SuperAdmin check error:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('SuperAdmin check failed:', error);
      return false;
    }
  }

  /**
   * Get current tenant context for user
   */
  private async getCurrentTenantContext(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Get tenant context error:', error);
        return null;
      }

      return data?.tenant_id || null;
    } catch (error) {
      console.error('Get tenant context failed:', error);
      return null;
    }
  }

  /**
   * Clear permission cache for specific user
   */
  private clearUserPermissionCache(userId: string): void {
    const keysToDelete = Array.from(this.permissionCache.keys())
      .filter(key => key.startsWith(`${userId}-`));
    
    keysToDelete.forEach(key => {
      this.permissionCache.delete(key);
    });
  }

  /**
   * Batch permission checking for UI components
   */
  async batchCheckPermissions(checks: PermissionCheck[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Execute checks in parallel for better performance
    const promises = checks.map(async (check) => {
      const key = `${check.resource}:${check.action}:${check.resourceId || 'null'}`;
      const result = await this.checkPermission(check);
      return { key, result };
    });

    const resolvedChecks = await Promise.all(promises);
    
    resolvedChecks.forEach(({ key, result }) => {
      results[key] = result;
    });

    return results;
  }
}

export const rbacService = RBACService.getInstance();

