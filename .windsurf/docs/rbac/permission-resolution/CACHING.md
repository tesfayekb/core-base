
# Permission Caching Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the multi-level caching strategy implemented in the permission resolution system.

## Multi-Level Caching

The permission resolution system employs a multi-level caching strategy:

1. **In-Memory Permission Cache**:
   - Caches individual permission check results
   - Uses composite keys: `${userId}:${tenantId}:${resource}:${action}`
   - Configurable TTL based on permission volatility

2. **User Permission Set Cache**:
   - Caches the complete set of permissions for a user
   - Invalidated on role or permission changes
   - Used for bulk permission checks

3. **Tenant-Specific Cache Entries**:
   - Separate cache entries for each tenant context
   - Prevents cross-tenant permission leakage
   - Optimizes multi-tenant scenarios

## Cache Implementation

```typescript
class PermissionCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTtl: number = 3600 * 1000; // 1 hour in milliseconds
  
  constructor(options?: { defaultTtl?: number }) {
    if (options?.defaultTtl) {
      this.defaultTtl = options.defaultTtl;
    }
  }
  
  get(key: string): boolean | undefined {
    const entry = this.cache.get(key);
    
    // Return undefined if not in cache or expired
    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) {
        this.cache.delete(key); // Clean up expired entry
      }
      return undefined;
    }
    
    return entry.value;
  }
  
  set(key: string, value: boolean, ttl: number = this.defaultTtl): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }
  
  invalidate(pattern: string): void {
    // Remove all matching entries (e.g., by userId or tenantId)
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
}

interface CacheEntry {
  value: boolean;
  expiresAt: number;
}
```

## Cache Invalidation Strategies

The system implements several cache invalidation strategies:

1. **Time-Based Invalidation**:
   - Each cache entry has a TTL (Time To Live)
   - Different TTLs for different permission types
   - Automatic expiration for stale entries

2. **Event-Based Invalidation**:
   - Cache invalidation on role changes
   - Cache invalidation on permission changes
   - Cache invalidation on user attribute changes

3. **Pattern-Based Invalidation**:
   - Invalidate all entries matching a pattern
   - Used for bulk invalidation of related permissions
   - Optimized for minimal invalidation scope

```typescript
// Event-based invalidation example
function invalidatePermissionCacheOnRoleChange(
  userId: string,
  tenantId?: string
): void {
  // Invalidate specific permission results
  permissionCache.invalidate(`${userId}:`);
  
  // Invalidate permission sets
  permissionSetCache.invalidate(`permset:${userId}`);
  
  // Invalidate tenant-specific permissions if needed
  if (tenantId) {
    permissionCache.invalidate(`${userId}:${tenantId}`);
    permissionSetCache.invalidate(`permset:${userId}:${tenantId}`);
  }
}
```

## Cache Distribution

The system supports distributed caching for multi-node deployments:

1. **Local Cache**:
   - In-memory cache for fastest performance
   - Node-specific, not shared across instances

2. **Distributed Cache**:
   - Redis-based distributed cache
   - Shared across all application instances
   - Consistent results in clustered environments

3. **Hybrid Approach**:
   - Two-tier cache with local and distributed layers
   - Local cache for hot entries
   - Distributed cache for consistency

```typescript
class HybridPermissionCache {
  private localCache: PermissionCache;
  private distributedCache: RedisPermissionCache;
  
  constructor() {
    this.localCache = new PermissionCache({ defaultTtl: 5 * 60 * 1000 }); // 5 minutes
    this.distributedCache = new RedisPermissionCache({ defaultTtl: 60 * 60 * 1000 }); // 1 hour
  }
  
  async get(key: string): Promise<boolean | undefined> {
    // Check local cache first
    const localResult = this.localCache.get(key);
    if (localResult !== undefined) {
      return localResult;
    }
    
    // If not in local cache, check distributed cache
    const distributedResult = await this.distributedCache.get(key);
    if (distributedResult !== undefined) {
      // Populate local cache from distributed cache
      this.localCache.set(key, distributedResult);
      return distributedResult;
    }
    
    return undefined;
  }
  
  async set(key: string, value: boolean): Promise<void> {
    // Set in both caches
    this.localCache.set(key, value);
    await this.distributedCache.set(key, value);
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Invalidate in both caches
    this.localCache.invalidate(pattern);
    await this.distributedCache.invalidate(pattern);
  }
}
```

## Related Documentation

- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)**: Overview of performance optimization
- **[BATCH_PROCESSING.md](BATCH_PROCESSING.md)**: Batched permission operations
- **[DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md)**: Database-level optimizations
- **[RESOLUTION_ALGORITHM.md](RESOLUTION_ALGORITHM.md)**: Permission resolution process

## Version History

- **1.0.0**: Initial document created from PERFORMANCE_OPTIMIZATION.md refactoring (2025-05-23)
