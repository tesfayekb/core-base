
// Basic RBAC Service Implementation - Enhanced for Phase 1.4 Completion
// Phase 1.4: RBAC Foundation with Complete Dependency Resolution

import { Role, Permission, UserRole, PermissionCheck } from '../../types/rbac';
import { rbacService } from './rbacService';
import { EntityBoundaryValidator } from './entityBoundaries';

export class BasicRBACService {
  
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
    return rbacService.checkPermission(userId, action, resource, resourceId, tenantId);
  }
  
  /**
   * Get user roles with proper typing and entity validation
   */
  async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
    return rbacService.getUserRoles(userId, tenantId);
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
    return rbacService.assignRole(assignerId, assigneeId, roleId, tenantId);
  }
  
  /**
   * Get effective permissions for user with dependency resolution
   */
  async getUserPermissions(userId: string, tenantId?: string): Promise<Permission[]> {
    return rbacService.getUserPermissions(userId, tenantId);
  }
  
  /**
   * Validate entity boundary for operations
   */
  async validateEntityBoundary(
    userId: string,
    entityId: string,
    operation: string,
    targetUserId?: string
  ): Promise<boolean> {
    return EntityBoundaryValidator.validateEntityBoundary(
      { userId, entityId, operation, targetUserId },
      (uid, permission) => this.checkPermission(uid, permission.split(':')[0], permission.split(':')[1])
    );
  }
  
  /**
   * Check if user can grant a specific permission
   */
  async canGrantPermission(
    grantorId: string,
    granteeId: string,
    permission: string,
    tenantId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    return EntityBoundaryValidator.canGrantPermission(
      {
        grantor: { userId: grantorId, entityId: tenantId },
        grantee: { userId: granteeId, entityId: tenantId },
        permission
      },
      (uid, perm) => this.checkPermission(uid, perm.split(':')[0], perm.split(':')[1])
    );
  }
  
  /**
   * Validate resource access within entity boundaries
   */
  async validateResourceAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    entityId: string
  ): Promise<boolean> {
    return EntityBoundaryValidator.validateResourceAccess(
      userId,
      resourceType,
      resourceId,
      entityId,
      (uid, permission) => this.checkPermission(uid, permission.split(':')[0], permission.split(':')[1])
    );
  }
}

// Export singleton instance
export const basicRbacService = new BasicRBACService();
