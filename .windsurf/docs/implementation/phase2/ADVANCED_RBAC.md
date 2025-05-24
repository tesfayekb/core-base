
# Phase 2.1: Advanced RBAC Implementation

> **Version**: 1.2.0  
> **Last Updated**: 2025-05-23

## Overview

This guide covers advanced RBAC features using the direct permission assignment model including complete permission resolution, caching strategies, and performance optimization. This builds on the basic RBAC foundation from Phase 1.4.

## Prerequisites

- Phase 1.4: RBAC Foundation completed with CRITICAL dependencies implemented
- **[../../rbac/ENTITY_BOUNDARIES.md](../../rbac/ENTITY_BOUNDARIES.md)**: Entity boundary patterns operational
- **[../../rbac/PERMISSION_DEPENDENCIES.md](../../rbac/PERMISSION_DEPENDENCIES.md)**: Permission dependencies functional
- Database schema and basic permissions operational
- User authentication system functional

## Advanced Permission Dependencies

### Complex Dependency Resolution
Building on [../../rbac/PERMISSION_DEPENDENCIES.md](../../rbac/PERMISSION_DEPENDENCIES.md):

**Advanced Dependency Patterns:**
- Cross-resource permission relationships
- Contextual permission dependencies
- Time-bound permission implications
- Approval-based permission dependencies

```typescript
// Advanced permission dependency resolution
async function resolveComplexPermissionDependencies(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  context?: PermissionContext
): Promise<boolean> {
  // 1. Basic permission check with dependencies
  if (await checkPermissionWithDependencies(userId, action, resourceType, resourceId)) {
    return true;
  }
  
  // 2. Check cross-resource dependencies
  const crossResourcePermissions = await getCrossResourceDependencies(resourceType, action);
  for (const dep of crossResourcePermissions) {
    if (await hasPermission(userId, dep.action, dep.resourceType)) {
      return true;
    }
  }
  
  // 3. Check contextual dependencies
  if (context) {
    const contextualPermissions = await getContextualDependencies(action, resourceType, context);
    for (const dep of contextualPermissions) {
      if (await hasPermission(userId, dep.action, dep.resourceType)) {
        return true;
      }
    }
  }
  
  return false;
}
```

### Permission Validation During Assignment
**CRITICAL**: Implement advanced entity boundary validation:

```typescript
// Advanced role assignment validation from ENTITY_BOUNDARIES.md
async function validateAdvancedRoleAssignment(
  assignerId: string,
  assigneeId: string,
  roleId: string,
  entityId: string
): Promise<{valid: boolean, violations: string[]}> {
  const violations: string[] = [];
  
  // 1. Basic entity boundary check
  const basicValidation = await validateRoleAssignment(assignerId, assigneeId, roleId, entityId);
  if (!basicValidation) {
    violations.push('Basic entity boundary validation failed');
  }
  
  // 2. Check permission dependencies in role
  const rolePermissions = await getRolePermissions(roleId);
  for (const permission of rolePermissions) {
    const dependencies = await getPermissionDependencies(permission.action, permission.resourceType);
    
    for (const dep of dependencies) {
      const hasDepPermission = await hasPermission(assignerId, dep.action, dep.resourceType);
      if (!hasDepPermission) {
        violations.push(`Missing dependency: ${dep.action}:${dep.resourceType} required for ${permission.action}:${permission.resourceType}`);
      }
    }
  }
  
  // 3. Check for permission conflicts
  const existingPermissions = await getUserPermissions(assigneeId, entityId);
  const conflicts = await detectPermissionConflicts(existingPermissions, rolePermissions);
  violations.push(...conflicts);
  
  return {
    valid: violations.length === 0,
    violations
  };
}
```

## Direct Permission Resolution System

### Core Algorithm Implementation
Following [../../rbac/permission-resolution/RESOLUTION_ALGORITHM.md](../../rbac/permission-resolution/RESOLUTION_ALGORITHM.md):

**Enhanced Direct Permission Resolution Process:**
- SuperAdmin check (fast path)
- Tenant context resolution
- Cache lookup for performance
- Direct role retrieval and validation
- **CRITICAL**: Permission dependency resolution
- Resource ID resolution
- **CRITICAL**: Entity boundary enforcement
- Direct permission checking with union logic

### Database Integration with Boundary Enforcement
Using [../../rbac/permission-resolution/DATABASE_QUERIES.md](../../rbac/permission-resolution/DATABASE_QUERIES.md):

```sql
-- Enhanced permission check with entity boundaries and dependencies
CREATE OR REPLACE FUNCTION check_advanced_permission(
  user_id UUID,
  action_name TEXT,
  resource_name TEXT,
  resource_id UUID DEFAULT NULL,
  entity_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
  user_entity_id UUID;
BEGIN
  -- 1. SuperAdmin bypass
  IF is_super_admin(user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- 2. Get user's entity context
  user_entity_id := COALESCE(entity_id, get_current_entity_id());
  IF user_entity_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 3. Check direct permissions with entity boundary
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    JOIN resources r ON p.resource_id = r.id
    WHERE ur.user_id = check_advanced_permission.user_id
    AND r.name = resource_name
    AND p.action = action_name
    AND (ur.entity_id = user_entity_id OR ur.entity_id IS NULL) -- Entity boundary check
  ) INTO has_permission;
  
  -- 4. If direct permission found, return true
  IF has_permission THEN
    RETURN TRUE;
  END IF;
  
  -- 5. Check permission dependencies
  RETURN check_permission_dependencies(user_id, action_name, resource_name, resource_id, user_entity_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Testing Requirements:**
- Test direct permission resolution for all permission types
- **CRITICAL**: Test permission dependency resolution
- **CRITICAL**: Test entity boundary enforcement
- Verify performance with large permission sets
- Test SuperAdmin bypass functionality
- Validate cache effectiveness

## Advanced Caching Strategy

### Multi-Level Caching Implementation
Following [../../rbac/CACHING_STRATEGY.md](../../rbac/CACHING_STRATEGY.md):

**Enhanced Cache Layers:**
- Memory-based direct permission cache
- **CRITICAL**: Permission dependency cache
- **CRITICAL**: Entity boundary validation cache
- Session-level permission storage
- Database query result caching
- Cache invalidation strategies

```typescript
// Advanced caching with dependency and boundary awareness
class AdvancedPermissionCache {
  private permissionCache = new Map<string, boolean>();
  private dependencyCache = new Map<string, string[]>();
  private boundaryCache = new Map<string, boolean>();
  
  async getPermission(
    userId: string,
    action: string,
    resource: string,
    entityId: string
  ): Promise<boolean> {
    const cacheKey = `${userId}:${action}:${resource}:${entityId}`;
    
    // Check permission cache
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }
    
    // Check entity boundary cache
    const boundaryKey = `boundary:${userId}:${entityId}`;
    if (!this.boundaryCache.has(boundaryKey)) {
      const hasAccess = await this.validateEntityBoundary(userId, entityId);
      this.boundaryCache.set(boundaryKey, hasAccess);
    }
    
    if (!this.boundaryCache.get(boundaryKey)) {
      this.permissionCache.set(cacheKey, false);
      return false;
    }
    
    // Resolve permission with dependencies
    const hasPermission = await this.resolvePermissionWithDependencies(userId, action, resource, entityId);
    this.permissionCache.set(cacheKey, hasPermission);
    
    return hasPermission;
  }
  
  invalidateUserPermissions(userId: string): void {
    // Clear all caches for user
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.permissionCache.delete(key);
      }
    }
    
    for (const key of this.boundaryCache.keys()) {
      if (key.includes(`${userId}:`)) {
        this.boundaryCache.delete(key);
      }
    }
  }
}
```

**Testing Requirements:**
- Test cache hit/miss scenarios
- **CRITICAL**: Test dependency cache accuracy
- **CRITICAL**: Test boundary cache effectiveness
- Verify cache invalidation on permission changes
- Test performance with and without caching
- Validate memory usage patterns

## Success Criteria

✅ Direct permission resolution algorithm fully operational  
✅ **CRITICAL**: Permission dependencies correctly implemented and tested  
✅ **CRITICAL**: Entity boundary validation enforced in all operations  
✅ Multi-level caching system active with dependency awareness  
✅ Performance targets met per PERFORMANCE_STANDARDS.md  
✅ All permission types resolve correctly using direct assignment  
✅ Cache invalidation working properly with boundary considerations  

## Next Steps

Continue to [ENHANCED_MULTI_TENANT.md](ENHANCED_MULTI_TENANT.md) for enhanced multi-tenant features.

## Related Documentation

- [../../rbac/permission-resolution/README.md](../../rbac/permission-resolution/README.md): Complete permission resolution overview
- [../../rbac/PERMISSION_DEPENDENCIES.md](../../rbac/PERMISSION_DEPENDENCIES.md): **MANDATORY** - Permission dependencies
- [../../rbac/ENTITY_BOUNDARIES.md](../../rbac/ENTITY_BOUNDARIES.md): **MANDATORY** - Entity boundary validation
- [../../rbac/CACHING_STRATEGY.md](../../rbac/CACHING_STRATEGY.md): Caching strategies

## Version History

- **1.2.0**: Integrated advanced permission dependencies and entity boundary validation (2025-05-23)
- **1.1.0**: Updated to align with direct permission assignment model (2025-05-23)
- **1.0.0**: Initial advanced RBAC implementation guide (2025-05-23)
