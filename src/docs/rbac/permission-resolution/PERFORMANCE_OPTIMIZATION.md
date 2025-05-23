
# Permission Resolution Performance Optimization

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document details performance optimization techniques for the permission resolution algorithm.

## Optimization Techniques

The algorithm includes these performance optimizations:

### 1. Multi-Level Caching

Permission resolution uses a multi-level caching strategy:

```typescript
class PermissionCache {
  private memoryCache: Map<string, {value: boolean, expires: number}> = new Map();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
  
  get(key: string): boolean | undefined {
    const item = this.memoryCache.get(key);
    if (!item) return undefined;
    
    if (item.expires < Date.now()) {
      this.memoryCache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  set(key: string, value: boolean, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + ttlMs
    });
  }
  
  invalidateUserPermissions(userId: string): void {
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.memoryCache.delete(key);
      }
    }
  }
  
  invalidateTenantPermissions(tenantId: string): void {
    const tenantPrefix = `:${tenantId}:`;
    for (const key of this.memoryCache.keys()) {
      if (key.includes(tenantPrefix)) {
        this.memoryCache.delete(key);
      }
    }
  }
}
```

### 2. Batched Permission Loading

Load all permissions for a user at once:

```typescript
async function preloadUserPermissions(
  userId: string,
  tenantId: string,
  resourceTypes: string[] = []
): Promise<void> {
  // Early return for SuperAdmin
  if (await isSuperAdmin(userId)) {
    return; // SuperAdmin has all permissions
  }
  
  // Get user roles
  const roles = await getUserRolesInTenant(userId, tenantId);
  if (roles.length === 0) return;
  
  // Build query for all permissions or filtered by resource types
  const query = db
    .from('role_permissions rp')
    .join('permissions p', 'p.id', 'rp.permission_id')
    .join('resources r', 'r.id', 'p.resource_id')
    .whereIn('rp.role_id', roles.map(r => r.id))
    .select('r.name as resource_type', 'p.action');
    
  if (resourceTypes.length > 0) {
    query.whereIn('r.name', resourceTypes);
  }
  
  // Execute query
  const permissions = await query;
  
  // Cache all permissions
  for (const { resource_type, action } of permissions) {
    const cacheKey = `${userId}:${tenantId}:${resource_type}:${action}`;
    permissionCache.set(cacheKey, true);
  }
}
```

### 3. Early Returns

The algorithm implements strategic early returns to avoid unnecessary processing:

```typescript
async function resolvePermission(
  userId: string,
  actionKey: string,
  resourceType: string,
  resourceId?: string,
  tenantId?: string
): Promise<boolean> {
  // 1. SuperAdmin check (early return)
  if (await isSuperAdmin(userId)) {
    return true;
  }
  
  // 2. Get effective tenant context (early return if none)
  const effectiveTenantId = tenantId || await getCurrentTenantContext(userId);
  if (!effectiveTenantId) {
    return false;
  }
  
  // 3. Check permission cache (early return if cached)
  const cacheKey = `${userId}:${effectiveTenantId}:${resourceType}:${actionKey}`;
  const cachedResult = permissionCache.get(cacheKey);
  if (cachedResult !== undefined) {
    return cachedResult;
  }
  
  // Continue with more expensive operations...
}
```

### 4. Permission Set Reuse

Reuse permission sets for multiple checks within the same request:

```typescript
class RequestScopedPermissionResolver {
  private userId: string;
  private tenantId: string;
  private loadedPermissions: Map<string, boolean> = new Map();
  private permissionCache: PermissionCache;
  
  constructor(
    userId: string,
    tenantId: string,
    permissionCache: PermissionCache
  ) {
    this.userId = userId;
    this.tenantId = tenantId;
    this.permissionCache = permissionCache;
  }
  
  async resolvePermission(
    actionKey: string,
    resourceType: string,
    resourceId?: string
  ): Promise<boolean> {
    // Check instance cache first
    const localCacheKey = `${resourceType}:${actionKey}`;
    if (this.loadedPermissions.has(localCacheKey)) {
      return this.loadedPermissions.get(localCacheKey)!;
    }
    
    // Check global cache
    const globalCacheKey = `${this.userId}:${this.tenantId}:${resourceType}:${actionKey}`;
    const cachedResult = this.permissionCache.get(globalCacheKey);
    if (cachedResult !== undefined) {
      this.loadedPermissions.set(localCacheKey, cachedResult);
      return cachedResult;
    }
    
    // Resolve permission
    const hasPermission = await this.checkPermissionInDatabase(
      actionKey,
      resourceType,
      resourceId
    );
    
    // Cache result both locally and globally
    this.loadedPermissions.set(localCacheKey, hasPermission);
    this.permissionCache.set(globalCacheKey, hasPermission);
    
    return hasPermission;
  }
  
  private async checkPermissionInDatabase(
    actionKey: string,
    resourceType: string,
    resourceId?: string
  ): Promise<boolean> {
    // Implementation of database check...
    return false;
  }
}
```

### 5. Optimized Database Queries

For optimal database performance:

1. **Indexed columns** for permission lookups
2. **Composite indexes** on frequently joined tables
3. **Prepared statements** for repeated permission checks
4. **Query plan caching** for common permission patterns

See [SQL_IMPLEMENTATION.md](SQL_IMPLEMENTATION.md) and [../DATABASE_OPTIMIZATION.md](../DATABASE_OPTIMIZATION.md) for detailed SQL optimization strategies.

## Integration with Caching Strategy

This optimization approach integrates with the broader caching strategy defined in [../CACHING_STRATEGY.md](../CACHING_STRATEGY.md):

1. **Memory Cache**: First level for high-frequency permission checks
2. **Distributed Cache**: Second level for cross-instance consistency
3. **Session Cache**: User-session specific permission sets
4. **Invalidation Events**: Coordinated cache invalidation on role/permission changes

## Related Documentation

- **[RESOLUTION_ALGORITHM_CORE.md](RESOLUTION_ALGORITHM_CORE.md)**: Core resolution algorithm
- **[SQL_IMPLEMENTATION.md](SQL_IMPLEMENTATION.md)**: SQL implementation details
- **[../CACHING_STRATEGY.md](../CACHING_STRATEGY.md)**: Permission caching approach
- **[../DATABASE_OPTIMIZATION.md](../DATABASE_OPTIMIZATION.md)**: Database optimization
- **[../PERMISSION_QUERY_OPTIMIZATION.md](../PERMISSION_QUERY_OPTIMIZATION.md)**: Permission query optimization

## Version History

- **1.0.0**: Initial performance optimization document (2025-05-22)
