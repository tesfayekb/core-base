
# Permission Resolution Core Algorithm

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the core algorithm used to resolve permissions for a user in a specific context. It focuses on the central logic flow and pseudocode implementation.

## Algorithm Pseudocode

```typescript
/**
 * Resolve whether a user has a specific permission
 */
async function resolvePermission(
  userId: string,
  actionKey: string,
  resourceType: string,
  resourceId?: string,
  tenantId?: string
): Promise<boolean> {
  // 1. SuperAdmin check (always returns true for SuperAdmins)
  if (await isSuperAdmin(userId)) {
    return true;
  }
  
  // 2. Get effective tenant context
  const effectiveTenantId = tenantId || await getCurrentTenantContext(userId);
  if (!effectiveTenantId) {
    return false; // No tenant context, cannot resolve permissions
  }
  
  // 3. Check permission cache
  const cacheKey = `${userId}:${effectiveTenantId}:${resourceType}:${actionKey}`;
  const cachedResult = permissionCache.get(cacheKey);
  if (cachedResult !== undefined) {
    return cachedResult;
  }
  
  // 4. Get all roles for the user in this tenant
  const roles = await getUserRolesInTenant(userId, effectiveTenantId);
  
  // 5. If no roles, user has no permissions
  if (roles.length === 0) {
    permissionCache.set(cacheKey, false);
    return false;
  }
  
  // 6. Get the resource ID for this resource type
  const resourceId = await getResourceIdByName(resourceType);
  if (!resourceId) {
    permissionCache.set(cacheKey, false);
    return false;
  }
  
  // 7. Check if any role has the required permission
  const hasPermission = await checkRolesForPermission(
    roles,
    resourceId,
    actionKey,
    resourceId
  );
  
  // 8. Cache and return the result
  permissionCache.set(cacheKey, hasPermission);
  return hasPermission;
}
```

## Key Algorithm Steps

1. **SuperAdmin Check**: Fast path for SuperAdmins who always have all permissions
2. **Tenant Context Resolution**: Determine the tenant context for the permission check
3. **Cache Lookup**: Check if the result is already cached for performance
4. **Role Retrieval**: Get all roles assigned to the user in the tenant
5. **Resource Resolution**: Resolve the resource type to its ID
6. **Permission Check**: Determine if any role has the required permission
7. **Result Caching**: Cache the result for future checks
8. **Decision**: Return the permission check result

## Early Return Optimizations

The algorithm implements several early returns for performance optimization:

1. SuperAdmin status (immediate approval)
2. Missing tenant context (immediate denial)
3. Cache hit (avoid database queries)
4. No assigned roles (immediate denial)
5. Non-existent resource (immediate denial)

## Permission Evaluation Logic

The core permission evaluation occurs in the `checkRolesForPermission` function, which:

1. Takes a list of user roles
2. Queries the database for role-permission associations
3. Checks if any role grants the required permission
4. Supports both direct and resource-specific permissions

## Related Documentation

- **[RESOLUTION_ALGORITHM.md](RESOLUTION_ALGORITHM.md)**: Overview of resolution process
- **[DATABASE_QUERIES.md](DATABASE_QUERIES.md)**: SQL implementation details
- **[SPECIAL_CASES.md](SPECIAL_CASES.md)**: Edge cases and special permission types
- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)**: Caching strategies
- **[../CACHING_STRATEGY.md](../CACHING_STRATEGY.md)**: Multi-level caching approach

## Version History

- **1.0.0**: Initial document created from RESOLUTION_ALGORITHM.md refactoring (2025-05-23)
