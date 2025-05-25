
// Basic RBAC Service Implementation - Updated to use RBACService
// Phase 1.4: RBAC Foundation with Database Integration

import { Role, Permission, UserRole, PermissionCheck } from '../../types/rbac';
import { rbacService } from './rbacService';

export class BasicRBACService {
  
  /**
   * Check if user has permission with dependency resolution
   */
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    tenantId?: string
  ): Promise<boolean> {
    return rbacService.checkPermission(userId, action, resource, resourceId, tenantId);
  }
  
  /**
   * Get user roles with proper typing
   */
  async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
    return rbacService.getUserRoles(userId, tenantId);
  }
  
  /**
   * Assign role to user with entity boundary validation
   */
  async assignRole(
    assignerId: string,
    assigneeId: string,
    roleId: string,
    tenantId: string
  ): Promise<{ success: boolean; error?: string }> {
    return rbacService.assignRole(assignerId, assigneeId, roleId, tenantId);
  }
  
  /**
   * Get effective permissions for user
   */
  async getUserPermissions(userId: string, tenantId?: string): Promise<Permission[]> {
    return rbacService.getUserPermissions(userId, tenantId);
  }
}
