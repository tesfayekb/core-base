// Basic RBAC Service Implementation - Enhanced for Phase 1.4 Completion
// Phase 1.4: RBAC Foundation with Complete Dependency Resolution

import { Role, Permission, UserRole, PermissionCheck } from '../../types/rbac';
import { rbacService } from './rbacService';
import { EntityBoundaryValidator } from './EntityBoundaryValidator';
import { dependencyValidationService } from './DependencyValidationService';

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
    try {
      const roleData = await rbacService.getUserRoles(userId, tenantId);
      
      // Flatten the array of role arrays and transform to match Role interface
      const flattenedRoles = roleData.flat();
      
      return flattenedRoles.map(roleInfo => ({
        id: roleInfo.id,
        tenant_id: tenantId || '',
        name: roleInfo.name,
        description: roleInfo.description || '',
        is_system_role: false, // Default to false, update if needed
        permissions: [], // Will be populated separately if needed
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }
  
  /**
   * Assign role to user with comprehensive dependency validation
   */
  async assignRole(
    assignerId: string,
    assigneeId: string,
    roleId: string,
    tenantId: string
  ): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
    // Pre-validate with dependency checking
    const validation = await dependencyValidationService.preValidateRoleAssignment(
      assignerId,
      roleId,
      assigneeId,
      tenantId
    );

    if (!validation.canProceed) {
      return { 
        success: false, 
        error: validation.blockingIssues.join('; '),
        warnings: validation.warnings
      };
    }

    // Proceed with the assignment
    const result = await rbacService.assignRole(assignerId, assigneeId, roleId, tenantId);
    
    return {
      ...result,
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined
    };
  }
  
  /**
   * Get effective permissions for user with dependency resolution
   */
  async getUserPermissions(userId: string, tenantId?: string): Promise<Permission[]> {
    try {
      const permissionData = await rbacService.getUserPermissions(userId, tenantId);
      
      // Transform the returned data to match Permission interface
      return permissionData.map(permInfo => ({
        id: permInfo.id || '',
        tenant_id: tenantId || '',
        name: permInfo.permission_name || `${permInfo.action}:${permInfo.resource}`,
        resource: permInfo.resource,
        action: permInfo.action as any,
        description: '',
        metadata: {},
        created_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
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
      { userId, entityId, operation, metadata: { targetUserId } },
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
    return this.validateEntityBoundary(userId, entityId, `access_${resourceType}`, resourceId);
  }

    /**
   * Validate role assignment before execution
   */
  async validateRoleAssignment(
    assignerId: string,
    roleId: string,
    assigneeId: string,
    tenantId: string
  ): Promise<{ valid: boolean; missingDependencies: string[]; warnings: string[] }> {
    const validation = await dependencyValidationService.validateRoleAssignment(
      assignerId,
      roleId,
      assigneeId,
      tenantId
    );

    return {
      valid: validation.valid,
      missingDependencies: validation.missingDependencies,
      warnings: validation.warnings
    };
  }
}

// Export singleton instance
export const basicRbacService = new BasicRBACService();
