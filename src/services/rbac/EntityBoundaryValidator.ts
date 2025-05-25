
// Entity Boundary Validator
// Implements entity-level permission isolation following ENTITY_BOUNDARIES.md

export interface EntityBoundaryContext {
  userId: string;
  entityId: string;
  operation: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface PermissionGrantContext {
  grantor: { userId: string; entityId: string };
  grantee: { userId: string; entityId: string };
  permission: string;
  resourceId?: string;
}

export class EntityBoundaryValidator {
  private static cache = new Map<string, { valid: boolean; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async validateEntityBoundary(
    context: EntityBoundaryContext,
    hasPermissionFn: (userId: string, permission: string) => Promise<boolean>
  ): Promise<boolean> {
    const cacheKey = `${context.userId}:${context.entityId}:${context.operation}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.valid;
    }

    try {
      // Basic entity access validation
      const hasEntityAccess = await hasPermissionFn(context.userId, `entity:access:${context.entityId}`);
      
      if (!hasEntityAccess) {
        // Check for broader entity permissions
        const hasBroaderAccess = await hasPermissionFn(context.userId, 'entity:access:*');
        if (!hasBroaderAccess) {
          this.cache.set(cacheKey, { valid: false, timestamp: Date.now() });
          return false;
        }
      }

      // Operation-specific validation
      const hasOperationPermission = await hasPermissionFn(
        context.userId, 
        `entity:${context.operation}:${context.entityId}`
      );

      const isValid = hasEntityAccess || hasOperationPermission;
      this.cache.set(cacheKey, { valid: isValid, timestamp: Date.now() });
      
      return isValid;
    } catch (error) {
      console.error('Entity boundary validation failed:', error);
      return false;
    }
  }

  static async canGrantPermission(
    context: PermissionGrantContext,
    hasPermissionFn: (userId: string, permission: string) => Promise<boolean>
  ): Promise<{ valid: boolean; reason?: string }> {
    const { grantor, grantee, permission, resourceId } = context;
    
    // 1. Check if grantor has the permission they're trying to grant
    if (!await hasPermissionFn(grantor.userId, permission)) {
      return { valid: false, reason: 'Grantor does not have the permission being granted' };
    }
    
    // 2. Check if grantor has permission to manage roles
    if (!await hasPermissionFn(grantor.userId, 'manage:roles')) {
      return { valid: false, reason: 'Grantor does not have role management permissions' };
    }
    
    // 3. Check entity boundary constraints
    if (grantor.entityId !== grantee.entityId) {
      if (!await hasPermissionFn(grantor.userId, 'cross_entity_management')) {
        return { valid: false, reason: 'Cross-entity permission grant not allowed' };
      }
    }
    
    // 4. Check resource-specific constraints
    if (resourceId && !await hasPermissionFn(grantor.userId, `manage:${permission.split(':')[0]}`)) {
      return { valid: false, reason: 'Grantor cannot manage specific resource permissions' };
    }
    
    return { valid: true };
  }

  static clearCache(userId?: string): void {
    if (userId) {
      for (const [key] of this.cache) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
