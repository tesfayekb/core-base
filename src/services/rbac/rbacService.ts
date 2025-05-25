import { supabase } from '@/integrations/supabase/client';
import { auditService } from '@/services/audit/auditService';

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
   * Check if user has direct permission (without dependencies)
   */
  async hasDirectPermission(
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

      // Updated function call to match the existing database function signature
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: userId,
        p_action: action,
        p_resource: resource,
        p_resource_id: resourceId || null
      });

      if (error) {
        console.error('Database permission check error:', error);
        
        // Audit the permission check failure
        await auditService.logPermissionCheck(action, resource, 'failure', resourceId);
        
        return false;
      }

      const hasPermission = Boolean(data);
      
      // Cache the result
      this.permissionCache.set(cacheKey, {
        hasPermission,
        timestamp: Date.now()
      });

      // Audit successful permission check
      await auditService.logPermissionCheck(action, resource, 'success', resourceId);

      console.log('✅ RBAC: Permission check result:', hasPermission);
      return hasPermission;

    } catch (error) {
      console.error('Database permission check error:', error);
      
      // Audit the permission check error
      await auditService.logPermissionCheck(action, resource, 'failure', resourceId);
      
      return false;
    }
  }

  /**
   * Check if user has permission, including dependencies
   */
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    // 1. Check direct permission
    if (await this.hasDirectPermission(userId, action, resource, resourceId)) {
      return true;
    }

    // Future: Add permission dependency resolution here

    return false;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    // Check cache
    const cachedPermissions = await this.getCachedUserPermissions(userId);
    if (cachedPermissions) {
      return cachedPermissions;
    }

    try {
      console.log('RBAC: Fetching all permissions from database for user:', userId);

      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user permissions:', error);
        return [];
      }

      const permissions: string[] = data?.map((item: any) => `${item.action_name}:${item.resource_name}`) || [];

      this.cacheUserPermissions(userId, permissions);
      return permissions;

    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return [];
    }
  }

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, roleId: string): Promise<boolean> {
    try {
      console.log(`RBAC: Assigning role ${roleId} to user ${userId}`);

      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role_id: roleId
      });

      if (error) {
        console.error('Error assigning role to user:', error);
        await auditService.logRoleAssignment(userId, roleId, 'failure', error.message);
        return false;
      }

      // Invalidate cache for user
      this.invalidateCache(userId);
      await auditService.logRoleAssignment(userId, roleId, 'success');
      return true;

    } catch (error) {
      console.error('Error assigning role to user:', error);
      await auditService.logRoleAssignment(userId, roleId, 'failure', String(error));
      return false;
    }
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, roleId: string): Promise<boolean> {
    try {
      console.log(`RBAC: Removing role ${roleId} from user ${userId}`);

      const { error } = await supabase.from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) {
        console.error('Error removing role from user:', error);
        await auditService.logRoleAssignment(userId, roleId, 'failure', error.message);
        return false;
      }

      this.invalidateCache(userId);
      await auditService.logRoleAssignment(userId, roleId, 'success');
      return true;

    } catch (error) {
      console.error('Error removing role from user:', error);
      await auditService.logRoleAssignment(userId, roleId, 'failure', String(error));
      return false;
    }
  }
}

export const rbacService = RBACService.getInstance();
