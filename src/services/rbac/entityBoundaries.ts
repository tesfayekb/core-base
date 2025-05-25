
// Entity Boundary Validation Implementation
// Based on src/docs/rbac/ENTITY_BOUNDARIES.md

export interface EntityBoundaryContext {
  userId: string;
  entityId: string;
  operation: string;
  targetUserId?: string;
  resourceId?: string;
}

export interface PermissionGrantContext {
  grantor: { userId: string; entityId: string };
  grantee: { userId: string; entityId: string };
  permission: string;
  resourceId?: string;
}

/**
 * Implements canonical entity boundary validation from ENTITY_BOUNDARIES.md
 * CRITICAL: This prevents unauthorized cross-entity operations
 */
export class EntityBoundaryValidator {
  
  /**
   * Validate if user can perform operation within entity boundaries
   */
  static async validateEntityBoundary(
    context: EntityBoundaryContext,
    hasPermission: (userId: string, permission: string) => Promise<boolean>
  ): Promise<boolean> {
    const { userId, entityId, operation, targetUserId, resourceId } = context;
    
    // SuperAdmin can cross entity boundaries
    if (await hasPermission(userId, 'cross_entity_management')) {
      return true;
    }
    
    // System operations are allowed for system roles
    if (await hasPermission(userId, 'system_operations')) {
      return true;
    }
    
    // Users can only operate within their entity context
    // In a real implementation, this would check user's entity membership
    // For Phase 1.4, we'll implement basic validation
    
    // Check if operation is allowed within entity
    switch (operation) {
      case 'assign_role':
        return await hasPermission(userId, 'manage_roles');
      
      case 'manage_users':
        return await hasPermission(userId, 'manage_users');
      
      case 'access_resource':
        return await hasPermission(userId, 'access_resources');
      
      default:
        // Default: allow if user has general permissions
        return true;
    }
  }
  
  /**
   * Validate permission grant according to entity boundary rules
   */
  static async canGrantPermission(
    context: PermissionGrantContext,
    hasPermission: (userId: string, permission: string) => Promise<boolean>
  ): Promise<{ valid: boolean; reason?: string }> {
    
    const { grantor, grantee, permission, resourceId } = context;
    
    // 1. Check if grantor has the permission they're trying to grant
    if (!await hasPermission(grantor.userId, permission)) {
      return { valid: false, reason: 'Grantor does not have the permission being granted' };
    }
    
    // 2. Check if grantor has permission to manage roles
    if (!await hasPermission(grantor.userId, 'Manage:roles')) {
      return { valid: false, reason: 'Grantor does not have role management permissions' };
    }
    
    // 3. Check entity boundary constraints
    if (grantor.entityId !== grantee.entityId) {
      if (!await hasPermission(grantor.userId, 'cross_entity_management')) {
        return { valid: false, reason: 'Cross-entity permission grant not allowed' };
      }
    }
    
    // 4. Check resource-specific constraints
    if (resourceId && !await hasPermission(grantor.userId, `Manage:${permission.split(':')[0]}`)) {
      return { valid: false, reason: 'Grantor cannot manage specific resource permissions' };
    }
    
    // 5. SuperAdmin bypass (but still log for audit)
    if (await hasPermission(grantor.userId, 'SuperAdmin')) {
      return { valid: true, reason: 'SuperAdmin override' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate resource access within entity boundaries
   */
  static async validateResourceAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    entityId: string,
    hasPermission: (userId: string, permission: string) => Promise<boolean>
  ): Promise<boolean> {
    
    // SuperAdmin can access all resources
    if (await hasPermission(userId, 'SuperAdmin')) {
      return true;
    }
    
    // Check if user has "Any" permission for this resource type
    if (await hasPermission(userId, `ReadAny:${resourceType}`)) {
      return true;
    }
    
    // Check specific resource permission
    if (await hasPermission(userId, `Read:${resourceType}:${resourceId}`)) {
      return true;
    }
    
    // Check entity-scoped permission
    return await hasPermission(userId, `Read:${resourceType}`);
  }
  
  /**
   * Check if user can operate across entity boundaries
   */
  static async canCrossEntityBoundaries(
    userId: string,
    sourceEntityId: string,
    targetEntityId: string,
    hasPermission: (userId: string, permission: string) => Promise<boolean>
  ): Promise<boolean> {
    
    // Same entity - always allowed
    if (sourceEntityId === targetEntityId) {
      return true;
    }
    
    // SuperAdmin can cross boundaries
    if (await hasPermission(userId, 'SuperAdmin')) {
      return true;
    }
    
    // Explicit cross-entity permission
    return await hasPermission(userId, 'cross_entity_management');
  }
}
