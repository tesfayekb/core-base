
# Caching Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-20

## Overview

This document details the multi-level caching architecture implemented to optimize permission checking performance.

## Multi-Level Caching Architecture

The RBAC system implements a sophisticated multi-level caching approach to maximize performance:

### 1. User Permission Cache

- **Structure**: Normalized map of `{ userId: { resourceType: { action: boolean } } }`
- **Cache Key Format**: `rbac:user:${userId}:permissions`
- **Cache Values**: JSON serialized permission map
- **Invalidation Triggers**:
  - Role assignment changes: `roleAssigned:${userId}` or `roleRemoved:${userId}` events
  - Permission changes: `permissionChanged:${roleId}` events
  - User attribute changes that affect permissions: `userAttributeChanged:${userId}` events
- **Refresh Strategy**:
  ```typescript
  class UserPermissionCache {
    // TTL in seconds (30 minutes default)
    private readonly TTL = 1800;
    
    async get(userId: string, resourceType: string, action: string): Promise<boolean> {
      const cacheKey = `rbac:user:${userId}:permissions`;
      let cachedValue = await cache.get(cacheKey);
      
      if (!cachedValue) {
        // Cache miss - load permissions from database
        const permissions = await loadUserPermissions(userId);
        await cache.set(cacheKey, JSON.stringify(permissions), this.TTL);
        cachedValue = permissions;
      } else {
        // Convert from JSON string if needed
        cachedValue = typeof cachedValue === 'string' ? JSON.parse(cachedValue) : cachedValue;
      }
      
      return cachedValue?.[resourceType]?.[action] || false;
    }
    
    async invalidate(userId: string): Promise<void> {
      const cacheKey = `rbac:user:${userId}:permissions`;
      await cache.delete(cacheKey);
    }
  }
  ```
- **Storage Location**: Distributed Redis cache with local memory LRU fallback
  ```typescript
  // Cache configuration
  const cacheConfig = {
    primary: new RedisCache({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'rbac:',
    }),
    fallback: new LRUCache({
      max: 1000, // Maximum items in cache
      ttl: 1800 * 1000, // TTL in milliseconds
    })
  };
  ```
- **Size Control**:
  ```typescript
  // LRU eviction policy implementation
  const lruOptions = {
    max: 10000, // Maximum number of cache entries
    maxAge: 1800 * 1000, // 30 minutes in milliseconds
    updateAgeOnGet: true, // Reset TTL on access
    dispose: (key: string, value: any) => {
      // Optional: Log cache evictions
      logger.debug(`LRU cache evicted item: ${key}`);
    }
  };
  ```

### 2. Role Permission Cache

- **Structure**: Normalized map of `{ roleId: { permissionId: boolean } }`
- **Cache Key Format**: `rbac:role:${roleId}:permissions`
- **Cache Values**: Set of granted permission IDs
- **Invalidation Triggers**:
  - Permission assignments: `permissionAdded:${roleId}:${permissionId}` events
  - Permission revocations: `permissionRemoved:${roleId}:${permissionId}` events
  - Role modifications: `roleUpdated:${roleId}` events
- **Refresh Strategy**:
  ```typescript
  class RolePermissionCache {
    // TTL in seconds (1 hour default)
    private readonly TTL = 3600;
    
    async getPermissions(roleId: string): Promise<Set<string>> {
      const cacheKey = `rbac:role:${roleId}:permissions`;
      let cachedValue = await cache.get(cacheKey);
      
      if (!cachedValue) {
        // Cache miss - load from database
        const permissions = await loadRolePermissions(roleId);
        const permissionSet = new Set(permissions.map(p => p.id));
        await cache.set(cacheKey, JSON.stringify([...permissionSet]), this.TTL);
        return permissionSet;
      }
      
      // Convert from JSON string if needed
      const permissionArray = typeof cachedValue === 'string' 
        ? JSON.parse(cachedValue)
        : cachedValue;
        
      return new Set(permissionArray);
    }
    
    async invalidate(roleId: string): Promise<void> {
      const cacheKey = `rbac:role:${roleId}:permissions`;
      await cache.delete(cacheKey);
      
      // Also invalidate all users with this role
      await this.invalidateUsersWithRole(roleId);
    }
    
    private async invalidateUsersWithRole(roleId: string): Promise<void> {
      const userIds = await getUsersWithRole(roleId);
      const userPermissionCache = new UserPermissionCache();
      
      // Invalidate each user's permission cache
      await Promise.all(userIds.map(userId => 
        userPermissionCache.invalidate(userId)
      ));
    }
  }
  ```
- **Cross-Instance Consistency**:
  ```typescript
  // Pub/Sub implementation for cross-instance cache invalidation
  class CacheInvalidationPubSub {
    private publisher: RedisClient;
    private subscriber: RedisClient;
    private readonly CHANNEL = 'rbac:cache:invalidation';
    
    constructor() {
      this.publisher = createRedisClient();
      this.subscriber = createRedisClient();
      
      this.subscriber.subscribe(this.CHANNEL);
      this.subscriber.on('message', (channel, message) => {
        if (channel === this.CHANNEL) {
          this.handleInvalidationMessage(JSON.parse(message));
        }
      });
    }
    
    publishInvalidation(type: string, id: string): void {
      const message = JSON.stringify({ type, id, timestamp: Date.now() });
      this.publisher.publish(this.CHANNEL, message);
    }
    
    private handleInvalidationMessage(message: any): void {
      const { type, id } = message;
      
      switch (type) {
        case 'role':
          const roleCache = new RolePermissionCache();
          roleCache.invalidate(id);
          break;
          
        case 'user':
          const userCache = new UserPermissionCache();
          userCache.invalidate(id);
          break;
          
        // Add other invalidation types as needed
      }
    }
  }
  ```
- **Backup Mechanism**:
  ```typescript
  async function getPermissionsWithFallback(roleId: string): Promise<Set<string>> {
    try {
      const rolePermissionCache = new RolePermissionCache();
      return await rolePermissionCache.getPermissions(roleId);
    } catch (error) {
      // Log cache error
      logger.error('Role permission cache error, falling back to database', {
        roleId,
        error: error.message,
        stack: error.stack
      });
      
      // Fall back to database query
      const permissions = await loadRolePermissionsFromDB(roleId);
      return new Set(permissions.map(p => p.id));
    }
  }
  ```

### 3. Entity Role Cache

- **Structure**: Normalized map of `{ entityId: { roleId: RoleDefinition } }`
- **Cache Key Format**: `rbac:entity:${entityId}:roles`
- **Cache Values**: Map of role IDs to role definitions
- **Invalidation Triggers**:
  - Role creation: `roleCreated:${entityId}:${roleId}` events
  - Role updates: `roleUpdated:${entityId}:${roleId}` events
  - Role deletions: `roleDeleted:${entityId}:${roleId}` events
- **Partition Strategy**:
  ```typescript
  // Shard configuration for horizontal scaling
  interface ShardConfig {
    shardCount: number;
    getShardIndex(entityId: string): number;
  }
  
  const entityRoleSharding: ShardConfig = {
    shardCount: 16, // Number of shards
    getShardIndex(entityId: string): number {
      // Simple hash function for shard determination
      let hash = 0;
      for (let i = 0; i < entityId.length; i++) {
        hash = ((hash << 5) - hash) + entityId.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash) % this.shardCount;
    }
  };
  
  // Usage
  function getEntityRoleCacheKey(entityId: string): string {
    const shardIndex = entityRoleSharding.getShardIndex(entityId);
    return `rbac:entity:shard:${shardIndex}:${entityId}:roles`;
  }
  ```
- **Update Frequency**:
  ```typescript
  class EntityRoleCache {
    // TTL in seconds (2 hours default)
    private readonly TTL = 7200;
    
    // Full refresh interval in seconds (24 hours)
    private readonly FULL_REFRESH_INTERVAL = 86400;
    
    async getRoles(entityId: string): Promise<Map<string, RoleDefinition>> {
      const cacheKey = getEntityRoleCacheKey(entityId);
      let cachedValue = await cache.get(cacheKey);
      let roles: Map<string, RoleDefinition>;
      
      if (!cachedValue) {
        // Cache miss - load from database
        const entityRoles = await loadEntityRoles(entityId);
        roles = new Map(entityRoles.map(r => [r.id, r]));
        await cache.set(cacheKey, JSON.stringify([...roles]), this.TTL);
        
        // Schedule background full refresh
        this.scheduleFullRefresh(entityId);
      } else {
        // Convert from JSON string if needed
        const roleEntries = typeof cachedValue === 'string' 
          ? JSON.parse(cachedValue)
          : cachedValue;
        roles = new Map(roleEntries);
      }
      
      return roles;
    }
    
    private scheduleFullRefresh(entityId: string): void {
      // Schedule a full refresh after the specified interval
      setTimeout(async () => {
        try {
          // Perform full refresh from database
          const entityRoles = await loadEntityRoles(entityId);
          const roles = new Map(entityRoles.map(r => [r.id, r]));
          
          const cacheKey = getEntityRoleCacheKey(entityId);
          await cache.set(cacheKey, JSON.stringify([...roles]), this.TTL);
          
          // Schedule next refresh
          this.scheduleFullRefresh(entityId);
        } catch (error) {
          logger.error('Failed to refresh entity role cache', {
            entityId,
            error: error.message
          });
        }
      }, this.FULL_REFRESH_INTERVAL * 1000);
    }
    
    async invalidate(entityId: string, roleId?: string): Promise<void> {
      if (roleId) {
        // Selective invalidation - update single role
        await this.updateSingleRole(entityId, roleId);
      } else {
        // Full invalidation
        const cacheKey = getEntityRoleCacheKey(entityId);
        await cache.delete(cacheKey);
      }
    }
    
    private async updateSingleRole(entityId: string, roleId: string): Promise<void> {
      const roles = await this.getRoles(entityId);
      const updatedRole = await loadEntityRole(entityId, roleId);
      
      if (updatedRole) {
        roles.set(roleId, updatedRole);
      } else {
        roles.delete(roleId);
      }
      
      const cacheKey = getEntityRoleCacheKey(entityId);
      await cache.set(cacheKey, JSON.stringify([...roles]), this.TTL);
    }
  }
  ```
- **Memory Footprint**:
  ```typescript
  // Compact representation with reference counting
  class CompactRoleStorage {
    // Global permission dictionary to avoid storing duplicate permission strings
    private static permissionDictionary: Map<string, number> = new Map();
    private static permissionReverseMap: string[] = [];
    
    static addPermissions(permissions: string[]): number[] {
      return permissions.map(permission => {
        if (!this.permissionDictionary.has(permission)) {
          const index = this.permissionReverseMap.length;
          this.permissionDictionary.set(permission, index);
          this.permissionReverseMap.push(permission);
          return index;
        }
        return this.permissionDictionary.get(permission)!;
      });
    }
    
    static getPermissions(indices: number[]): string[] {
      return indices.map(index => this.permissionReverseMap[index]);
    }
    
    // Convert a role to its compact representation
    static compactRole(role: RoleDefinition): CompactRoleDefinition {
      return {
        i: role.id,
        n: role.name,
        p: this.addPermissions(role.permissions),
        m: {
          c: role.metadata.created_at,
          u: role.metadata.updated_at,
          s: role.metadata.system_role ? 1 : 0
        }
      };
    }
    
    // Convert back from compact representation
    static expandRole(compactRole: CompactRoleDefinition): RoleDefinition {
      return {
        id: compactRole.i,
        name: compactRole.n,
        permissions: this.getPermissions(compactRole.p),
        metadata: {
          created_at: compactRole.m.c,
          updated_at: compactRole.m.u,
          system_role: compactRole.m.s === 1
        }
      };
    }
  }
  ```

## Adaptive Caching Strategies

### Dynamic Cache Sizing

```typescript
class AdaptivePermissionCache {
  private readonly cache: Map<string, any> = new Map();
  private readonly hitCounts: Map<string, number> = new Map();
  private readonly missCounts: Map<string, number> = new Map();
  private readonly accessTimestamps: Map<string, number> = new Map();
  
  // Configuration
  private maxSize: number = 10000;
  private ttl: number = 1800000; // 30 minutes in milliseconds
  private adaptationInterval: number = 300000; // 5 minutes in milliseconds
  
  constructor() {
    // Run periodic adaptation
    setInterval(() => this.adaptCacheParameters(), this.adaptationInterval);
  }
  
  // Adapt cache parameters based on usage patterns
  private adaptCacheParameters(): void {
    // Analyze cache effectiveness
    let totalHits = 0;
    let totalMisses = 0;
    
    this.hitCounts.forEach(count => totalHits += count);
    this.missCounts.forEach(count => totalMisses += count);
    
    const hitRate = totalHits / (totalHits + totalMisses || 1);
    
    // Adapt cache size based on hit rate
    if (hitRate < 0.5 && this.maxSize < 50000) {
      // Low hit rate, increase cache size
      this.maxSize *= 1.5;
      console.log(`Increasing permission cache size to ${this.maxSize} entries due to low hit rate (${hitRate.toFixed(2)})`);
    } else if (hitRate > 0.9 && this.maxSize > 5000) {
      // High hit rate, we might be able to reduce cache size
      this.maxSize = Math.floor(this.maxSize * 0.8);
      console.log(`Decreasing permission cache size to ${this.maxSize} entries due to high hit rate (${hitRate.toFixed(2)})`);
    }
    
    // Analyze TTL effectiveness
    let expiredHits = 0;
    let unexpiredEntriesCount = 0;
    const now = Date.now();
    
    this.accessTimestamps.forEach((timestamp, key) => {
      if (now - timestamp > this.ttl) {
        // This would have been a hit but expired
        expiredHits++;
      } else {
        unexpiredEntriesCount++;
      }
    });
    
    // If we have many expired entries that would have been hits, increase TTL
    if (expiredHits > 100 && expiredHits / (totalHits + 1) > 0.1) {
      this.ttl *= 1.5;
      console.log(`Increasing permission cache TTL to ${this.ttl}ms due to ${expiredHits} potential hits expiring`);
    }
    
    // If we have low utilization but high memory pressure, decrease TTL
    if (unexpiredEntriesCount < this.maxSize * 0.3 && this.ttl > 900000) {
      this.ttl *= 0.7;
      console.log(`Decreasing permission cache TTL to ${this.ttl}ms due to low utilization`);
    }
  }
}
```

### Predictive Pre-Loading

```typescript
class PermissionPreloader {
  private static readonly PRELOAD_THRESHOLD = 100; // ms
  private static preloadQueue: Array<() => Promise<void>> = [];
  private static isProcessing = false;
  
  // Preload permissions based on navigation
  static preloadForNavigation(userId: string, route: string): void {
    // Map routes to likely needed permissions
    const routePermissionMap: Record<string, Array<{ resource: string, action: string }>> = {
      '/users': [
        { resource: 'users', action: 'ViewAny' },
        { resource: 'users', action: 'Create' },
        { resource: 'users', action: 'Delete' }
      ],
      '/roles': [
        { resource: 'roles', action: 'ViewAny' },
        { resource: 'roles', action: 'Create' },
        { resource: 'roles', action: 'Update' }
      ],
      // Additional routes...
    };
    
    const permissionsToPreload = routePermissionMap[route] || [];
    
    if (permissionsToPreload.length === 0) return;
    
    this.enqueue(async () => {
      const permissionChecks = permissionsToPreload.map(p => ({
        userId,
        resource: p.resource,
        action: p.action
      }));
      
      // Batch fetch permissions
      await permissionService.checkBatchPermissions(permissionChecks);
    });
  }
  
  private static async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    while (this.preloadQueue.length > 0) {
      const preloadFn = this.preloadQueue.shift()!;
      
      // Execute during idle time if possible
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          preloadFn().catch(error => {
            console.error('Permission preloading error:', error);
          });
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          preloadFn().catch(error => {
            console.error('Permission preloading error:', error);
          });
        }, 0);
      }
      
      // Small delay between preloads to avoid blocking
      await new Promise(resolve => setTimeout(resolve, this.PRELOAD_THRESHOLD));
    }
    
    this.isProcessing = false;
  }
}
```

## Fallback Mechanisms

### Circuit Breaker Pattern

```typescript
class ResilientPermissionSystem {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 100; // ms
  private static readonly CIRCUIT_OPEN_DURATION = 30000; // 30 seconds
  private static circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  private static circuitOpenTime: number = 0;
  private static recentFailures: number = 0;
  private static readonly FAILURE_THRESHOLD = 5;
  
  // Circuit breaker implementation
  private static isCircuitOpen(): boolean {
    if (this.circuitState === 'closed') {
      return false;
    }
    
    if (this.circuitState === 'open') {
      // Check if it's time to try again
      if (Date.now() - this.circuitOpenTime > this.CIRCUIT_OPEN_DURATION) {
        this.circuitState = 'half-open';
        return false;
      }
      return true;
    }
    
    // Half-open state
    return false;
  }
  
  private static recordSuccess(): void {
    if (this.circuitState === 'half-open') {
      this.circuitState = 'closed';
      this.recentFailures = 0;
    }
  }
  
  private static recordFailure(): void {
    this.recentFailures++;
    
    if (this.recentFailures >= this.FAILURE_THRESHOLD || this.circuitState === 'half-open') {
      this.circuitState = 'open';
      this.circuitOpenTime = Date.now();
      this.recentFailures = 0;
      console.warn('Permission check circuit opened due to failures');
    }
  }
  
  // Check permission with resilience patterns
  static async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Try cache first
    try {
      const cacheResult = await this.getFromCache(userId, resource, action);
      if (cacheResult !== undefined) {
        return cacheResult;
      }
    } catch (error) {
      console.warn('Permission cache error:', error);
      // Continue to database check on cache failure
    }
    
    // Handle circuit breaker for database access
    if (this.isCircuitOpen()) {
      // Circuit is open, use fallback strategy
      return this.useFallbackStrategy(userId, resource, action);
    }
    
    // Try database with retries
    let retries = 0;
    while (retries <= this.MAX_RETRIES) {
      try {
        const result = await this.checkPermissionFromDatabase(userId, resource, action);
        
        // Success, update circuit state
        this.recordSuccess();
        
        // Update cache
        try {
          await this.setInCache(userId, resource, action, result);
        } catch (cacheError) {
          console.warn('Permission cache update error:', cacheError);
        }
        
        return result;
      } catch (error) {
        retries++;
        console.warn(`Permission check failed (attempt ${retries}):`, error);
        
        if (retries <= this.MAX_RETRIES) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, retries - 1))
          );
        } else {
          // Record failure and possibly open circuit
          this.recordFailure();
          
          // Use fallback strategy
          return this.useFallbackStrategy(userId, resource, action);
        }
      }
    }
    
    // Should not reach here, but default to secure option
    return false;
  }
}
```

## Related Documentation

- **[README.md](README.md)**: RBAC system overview
- **[PERMISSION_RESOLUTION.md](PERMISSION_RESOLUTION.md)**: How permissions are resolved for users
- **[DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md)**: Database design and optimization for permissions
- **[MONITORING_ANALYTICS.md](MONITORING_ANALYTICS.md)**: Monitoring, metrics, and analytics implementation

## Version History

- **1.0.0**: Initial document created from RBAC_SYSTEM.md refactoring
