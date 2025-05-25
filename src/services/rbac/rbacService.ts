
import { supabase } from '@/integrations/supabase/client';
import { auditService } from '@/services/audit/auditService';
import { Role, Permission } from '@/types/rbac';

interface PermissionCacheEntry {
  hasPermission: boolean;
  timestamp: number;
}

interface UserPermissionsCacheEntry {
  permissions: string[];
  timestamp: number;
}

export class RBACService {
  private static instance: RBACService;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private permissionCache: Map<string, PermissionCacheEntry> = new Map();
  private userPermissionsCache: Map<string, UserPermissionsCacheEntry> = new Map();

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  private constructor() { }

  clearCache(): void {
    this.permissionCache.clear();
    this.userPermissionsCache.clear();
  }

  private invalidateCache(userId: string): void {
    // Invalidate permission cache for user
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(userId + ':')) {
        this.permissionCache.delete(key);
      }
    }

    // Invalidate user permissions cache
    this.userPermissionsCache.delete(userId);
  }

  private async getCachedUserPermissions(userId: string): Promise<string[] | null> {
    const cached = this.userPermissionsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('🎯 RBAC: User permissions cache hit');
      return cached.permissions;
    }
    return null;
  }

  private cacheUserPermissions(userId: string, permissions: string[]): void {
    this.userPermissionsCache.set(userId, {
      permissions,
      timestamp: Date.now()
    });
  }

  /**
   * Check if user has permission (updated signature)
   */
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    const cacheKey = `${userId}:${action}:${resource}:${resourceId || 'any'}`;
    
    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      const cached = this.permissionCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('🎯 RBAC: Cache hit for permission check');
        return cached.hasPermission;
      }
    }

    try {
      console.log('🔍 RBAC: Checking permission in database:', {
        userId,
        action,
        resource,
        resourceId
      });

      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: userId,
        p_action: action,
        p_resource: resource,
        p_resource_id: resourceId || null
      });

      if (error) {
        console.error('Database permission check error:', error);
        await auditService.logPermissionCheck(action, resource, 'failure', resourceId);
        return false;
      }

      const hasPermission = Boolean(data);
      
      // Cache the result
      this.permissionCache.set(cacheKey, {
        hasPermission,
        timestamp: Date.now()
      });

      await auditService.logPermissionCheck(action, resource, 'success', resourceId);
      console.log('✅ RBAC: Permission check result:', hasPermission);
      return hasPermission;

    } catch (error) {
      console.error('Database permission check error:', error);
      await auditService.logPermissionCheck(action, resource, 'failure', resourceId);
      return false;
    }
  }

  /**
   * Get all permissions for a user (returns Permission objects)
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      console.log('RBAC: Fetching all permissions from database for user:', userId);

      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user permissions:', error);
        return [];
      }

      // Convert to Permission objects
      const permissions: Permission[] = data?.map((item: any) => ({
        id: item.id || `${item.action_name}-${item.resource_name}`,
        tenant_id: item.tenant_id || '',
        name: `${item.action_name}:${item.resource_name}`,
        resource: item.resource_name,
        action: item.action_name,
        description: item.description,
        created_at: item.created_at || new Date().toISOString()
      })) || [];

      return permissions;

    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return [];
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      console.log('RBAC: Fetching user roles from database for user:', userId);

      const { data, error } = await supabase.rpc('get_user_roles', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }

  /**
   * Assign a role to a user (returns success/error object)
   */
  async assignRole(userId: string, roleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`RBAC: Assigning role ${roleId} to user ${userId}`);

      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role_id: roleId
      });

      if (error) {
        console.error('Error assigning role to user:', error);
        await auditService.logRoleAssignment(userId, roleId, 'failure', error.message);
        return { success: false, error: error.message };
      }

      this.invalidateCache(userId);
      await auditService.logRoleAssignment(userId, roleId, 'success');
      return { success: true };

    } catch (error) {
      console.error('Error assigning role to user:', error);
      const errorMessage = String(error);
      await auditService.logRoleAssignment(userId, roleId, 'failure', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, roleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`RBAC: Removing role ${roleId} from user ${userId}`);

      const { error } = await supabase.from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) {
        console.error('Error removing role from user:', error);
        await auditService.logRoleAssignment(userId, roleId, 'failure', error.message);
        return { success: false, error: error.message };
      }

      this.invalidateCache(userId);
      await auditService.logRoleAssignment(userId, roleId, 'success');
      return { success: true };

    } catch (error) {
      console.error('Error removing role from user:', error);
      const errorMessage = String(error);
      await auditService.logRoleAssignment(userId, roleId, 'failure', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}

export const rbacService = RBACService.getInstance();
