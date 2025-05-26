
// Performance-optimized caching service for user data
import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

export class UserCacheService {
  private static instance: UserCacheService;
  private userCache: LRUCache<string, any>;
  private roleCache: LRUCache<string, any>;
  private queryCache: LRUCache<string, any>;

  private constructor() {
    // User data cache - 1000 users max, 10 minute TTL
    this.userCache = new LRUCache({
      max: 1000,
      ttl: 10 * 60 * 1000,
      updateAgeOnGet: true
    });

    // Role data cache - 500 roles max, 15 minute TTL
    this.roleCache = new LRUCache({
      max: 500,
      ttl: 15 * 60 * 1000,
      updateAgeOnGet: true
    });

    // Query result cache - 200 queries max, 5 minute TTL
    this.queryCache = new LRUCache({
      max: 200,
      ttl: 5 * 60 * 1000,
      updateAgeOnGet: true
    });
  }

  static getInstance(): UserCacheService {
    if (!UserCacheService.instance) {
      UserCacheService.instance = new UserCacheService();
    }
    return UserCacheService.instance;
  }

  // User caching methods
  getCachedUser(userId: string): any | undefined {
    return this.userCache.get(userId);
  }

  setCachedUser(userId: string, userData: any): void {
    this.userCache.set(userId, userData);
  }

  invalidateUser(userId: string): void {
    this.userCache.delete(userId);
  }

  // Role caching methods
  getCachedRoles(tenantId: string): any[] | undefined {
    return this.roleCache.get(`roles_${tenantId}`);
  }

  setCachedRoles(tenantId: string, roles: any[]): void {
    this.roleCache.set(`roles_${tenantId}`, roles);
  }

  invalidateRoles(tenantId: string): void {
    this.roleCache.delete(`roles_${tenantId}`);
  }

  // Query result caching
  getCachedQuery(queryKey: string): any | undefined {
    return this.queryCache.get(queryKey);
  }

  setCachedQuery(queryKey: string, result: any): void {
    this.queryCache.set(queryKey, result);
  }

  invalidateQuery(queryKey: string): void {
    this.queryCache.delete(queryKey);
  }

  // Batch operations for performance
  getCachedUsers(userIds: string[]): Map<string, any> {
    const results = new Map();
    for (const userId of userIds) {
      const cached = this.getCachedUser(userId);
      if (cached) {
        results.set(userId, cached);
      }
    }
    return results;
  }

  setCachedUsers(users: Array<{ id: string; data: any }>): void {
    for (const { id, data } of users) {
      this.setCachedUser(id, data);
    }
  }

  // Cache statistics for monitoring
  getCacheStats() {
    return {
      users: {
        size: this.userCache.size,
        hits: this.userCache.calculatedSize,
        max: this.userCache.max
      },
      roles: {
        size: this.roleCache.size,
        hits: this.roleCache.calculatedSize,
        max: this.roleCache.max
      },
      queries: {
        size: this.queryCache.size,
        hits: this.queryCache.calculatedSize,
        max: this.queryCache.max
      }
    };
  }

  // Clear all caches
  clearAll(): void {
    this.userCache.clear();
    this.roleCache.clear();
    this.queryCache.clear();
  }

  // Cache warming for frequently accessed data
  async warmCache(tenantId: string, userIds: string[]): Promise<void> {
    // This would typically pre-load frequently accessed users
    console.log(`Warming cache for tenant ${tenantId} with ${userIds.length} users`);
  }
}

export const userCacheService = UserCacheService.getInstance();
