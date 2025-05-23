
# Special Permission Resolution Cases

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document details special cases and exceptions in the permission resolution process that go beyond the standard algorithm.

## Resource-Specific Permissions

Some permissions apply to specific resources rather than resource types:

```typescript
async function resolveResourceSpecificPermission(
  userId: string,
  actionKey: string,
  resourceType: string,
  specificResourceId: string,
  tenantId?: string
): Promise<boolean> {
  // First check general permission (may be sufficient)
  const hasGeneralPermission = await resolvePermission(
    userId, 
    actionKey, 
    resourceType,
    undefined,
    tenantId
  );
  
  if (hasGeneralPermission) {
    return true;
  }
  
  // If no general permission, check resource-specific permission
  // This is only implemented for certain resource types
  if (!supportsResourceSpecificPermissions(resourceType)) {
    return false;
  }
  
  // Implementation of resource-specific permission check
  // ...
}
```

## Permission Wildcards

For specialized cases, permission wildcards can be used:

```typescript
// Example wildcard resolution (used rarely in specific contexts)
function checkWildcardPermission(
  requiredPermission: string,
  userPermissions: string[]
): boolean {
  // Exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  // Wildcard matches
  // Format: "resource:*" or "*:action"
  const [resourceType, action] = requiredPermission.split(':');
  
  // Resource wildcard
  if (userPermissions.includes(`*:${action}`)) {
    return true;
  }
  
  // Action wildcard
  if (userPermissions.includes(`${resourceType}:*`)) {
    return true;
  }
  
  // Global wildcard (SuperAdmin only)
  if (userPermissions.includes('*:*')) {
    return true;
  }
  
  return false;
}
```

## Owner Permissions

Resource owners may have special permissions regardless of role assignments:

```typescript
async function checkOwnerPermission(
  userId: string,
  resourceType: string,
  resourceId: string,
  tenantId?: string
): Promise<boolean> {
  // Get effective tenant context
  const effectiveTenantId = tenantId || await getCurrentTenantContext(userId);
  
  // Check if resource type supports ownership
  if (!supportsOwnership(resourceType)) {
    return false;
  }
  
  // Check if user is the owner of this resource
  const isOwner = await checkResourceOwnership(userId, resourceType, resourceId, effectiveTenantId);
  
  // If user is owner, check if ownership grants this permission
  if (isOwner) {
    const ownerPermissions = await getOwnerPermissions(resourceType);
    return ownerPermissions.includes(resourceType);
  }
  
  return false;
}
```

## Delegation Permissions

Temporarily delegated permissions require special handling:

```typescript
async function checkDelegatedPermission(
  userId: string,
  actionKey: string,
  resourceType: string,
  resourceId?: string,
  tenantId?: string
): Promise<boolean> {
  // Get effective tenant context
  const effectiveTenantId = tenantId || await getCurrentTenantContext(userId);
  
  // Check active delegations
  const activeDelegations = await getActiveDelegations(
    userId,
    effectiveTenantId,
    new Date()
  );
  
  // No active delegations
  if (activeDelegations.length === 0) {
    return false;
  }
  
  // Check if any delegation grants this permission
  for (const delegation of activeDelegations) {
    const hasDelegatedPermission = await checkDelegationPermission(
      delegation.id,
      actionKey,
      resourceType,
      resourceId
    );
    
    if (hasDelegatedPermission) {
      // Log delegation use for audit
      await logDelegationUse(delegation.id, userId, actionKey, resourceType, resourceId);
      return true;
    }
  }
  
  return false;
}
```

## Time-Bound Permissions

Permissions that are only valid during specific time periods:

```typescript
async function checkTimeConstrainedPermission(
  userId: string,
  actionKey: string,
  resourceType: string,
  resourceId?: string,
  tenantId?: string
): Promise<boolean> {
  // Get role permissions that match this request
  const permissions = await getRolePermissions(
    userId,
    actionKey,
    resourceType,
    tenantId
  );
  
  // Check time constraints on matching permissions
  const now = new Date();
  
  for (const permission of permissions) {
    // If permission has no time constraints, it's valid
    if (!permission.timeConstraints) {
      return true;
    }
    
    const { validFrom, validUntil, validDays, validHours } = permission.timeConstraints;
    
    // Check validity period
    if (validFrom && now < new Date(validFrom)) continue;
    if (validUntil && now > new Date(validUntil)) continue;
    
    // Check day of week
    if (validDays && !validDays.includes(now.getDay())) continue;
    
    // Check hour of day
    const currentHour = now.getHours();
    if (validHours && !(validHours.start <= currentHour && currentHour <= validHours.end)) continue;
    
    // Permission is valid for current time
    return true;
  }
  
  return false;
}
```

## Related Documentation

- **[RESOLUTION_ALGORITHM_CORE.md](RESOLUTION_ALGORITHM_CORE.md)**: Core resolution algorithm
- **[SQL_IMPLEMENTATION.md](SQL_IMPLEMENTATION.md)**: SQL implementation details
- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)**: Optimization techniques
- **[../CACHING_STRATEGY.md](../CACHING_STRATEGY.md)**: Permission caching approach

## Version History

- **1.0.0**: Initial special cases document (2025-05-22)
