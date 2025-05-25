
// Advanced RBAC Caching System
// Multi-level caching with smart invalidation and warming strategies

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  dependencies: string[];
}

export interface CacheStats {
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  totalEntries: number;
  memoryUsage: number;
}

export class AdvancedCacheManager {
  private static instance: AdvancedCacheManager;
  
  // Multi-level cache storage
  private l1Cache = new Map<string, CacheEntry<any>>(); // Hot cache - 1000 entries
  private l2Cache = new Map<string, CacheEntry<any>>(); // Warm cache - 10000 entries
  private l3Cache = new Map<string, CacheEntry<any>>(); // Cold cache - 50000 entries
  
  // Cache configuration
  private readonly L1_MAX_SIZE = 1000;
  private readonly L2_MAX_SIZE = 10000;
  private readonly L3_MAX_SIZE = 50000;
  
  private readonly L1_TTL = 5 * 60 * 1000;   // 5 minutes
  private readonly L2_TTL = 30 * 60 * 1000;  // 30 minutes
  private readonly L3_TTL = 2 * 60 * 60 * 1000; // 2 hours
  
  // Performance tracking
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  
  // Dependency tracking
  private dependencyMap = new Map<string, Set<string>>();

  static getInstance(): AdvancedCacheManager {
    if (!AdvancedCacheManager.instance) {
      AdvancedCacheManager.instance = new AdvancedCacheManager();
    }
    return AdvancedCacheManager.instance;
  }

  /**
   * Get value from cache with multi-level lookup
   */
  get<T>(key: string): T | null {
    this.stats.totalRequests++;
    
    // Check L1 cache (hot)
    let entry = this.l1Cache.get(key);
    if (entry && this.isEntryValid(entry)) {
      this.updateAccessMetrics(entry);
      this.stats.cacheHits++;
      return entry.value;
    }
    
    // Check L2 cache (warm)
    entry = this.l2Cache.get(key);
    if (entry && this.isEntryValid(entry)) {
      this.updateAccessMetrics(entry);
      this.promoteToL1(key, entry);
      this.stats.cacheHits++;
      return entry.value;
    }
    
    // Check L3 cache (cold)
    entry = this.l3Cache.get(key);
    if (entry && this.isEntryValid(entry)) {
      this.updateAccessMetrics(entry);
      this.promoteToL2(key, entry);
      this.stats.cacheHits++;
      return entry.value;
    }
    
    this.stats.cacheMisses++;
    return null;
  }

  /**
   * Set value in cache with automatic level assignment
   */
  set<T>(key: string, value: T, ttl?: number, dependencies: string[] = []): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.L1_TTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      dependencies
    };
    
    // Always start in L1 (hot cache)
    this.setInL1(key, entry);
    
    // Track dependencies
    this.updateDependencyMap(key, dependencies);
  }

  /**
   * Invalidate cache entries by key pattern or dependencies
   */
  invalidate(pattern: string | RegExp): void {
    const isRegex = pattern instanceof RegExp;
    const keysToInvalidate = new Set<string>();
    
    // Find matching keys in all cache levels
    [this.l1Cache, this.l2Cache, this.l3Cache].forEach(cache => {
      cache.forEach((_, key) => {
        if (isRegex ? pattern.test(key) : key.includes(pattern as string)) {
          keysToInvalidate.add(key);
        }
      });
    });
    
    // Remove from all cache levels
    keysToInvalidate.forEach(key => {
      this.l1Cache.delete(key);
      this.l2Cache.delete(key);
      this.l3Cache.delete(key);
      this.dependencyMap.delete(key);
    });
  }

  /**
   * Invalidate by dependency
   */
  invalidateByDependency(dependency: string): void {
    const keysToInvalidate = new Set<string>();
    
    // Find all keys that depend on this dependency
    this.dependencyMap.forEach((deps, key) => {
      if (deps.has(dependency)) {
        keysToInvalidate.add(key);
      }
    });
    
    // Invalidate all dependent keys
    keysToInvalidate.forEach(key => {
      this.l1Cache.delete(key);
      this.l2Cache.delete(key);
      this.l3Cache.delete(key);
      this.dependencyMap.delete(key);
    });
  }

  /**
   * Warm cache with common permissions
   */
  async warmCache(commonPermissions: Array<{
    userId: string;
    action: string;
    resource: string;
    context?: any;
  }>, permissionResolver: (userId: string, action: string, resource: string, context?: any) => Promise<boolean>): Promise<void> {
    console.log(`Warming cache with ${commonPermissions.length} common permissions...`);
    
    const warmingPromises = commonPermissions.map(async (perm) => {
      const key = `${perm.userId}:${perm.action}:${perm.resource}:${JSON.stringify(perm.context || {})}`;
      
      // Only warm if not already cached
      if (!this.get(key)) {
        try {
          const result = await permissionResolver(perm.userId, perm.action, perm.resource, perm.context);
          this.set(key, result, this.L2_TTL, [`user:${perm.userId}`, `resource:${perm.resource}`]);
        } catch (error) {
          console.error(`Failed to warm cache for ${key}:`, error);
        }
      }
    });
    
    await Promise.allSettled(warmingPromises);
    console.log('Cache warming completed');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.cacheHits / this.stats.totalRequests) * 100 
      : 0;
    
    const totalEntries = this.l1Cache.size + this.l2Cache.size + this.l3Cache.size;
    
    return {
      hitRate,
      totalRequests: this.stats.totalRequests,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      totalEntries,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.l3Cache.clear();
    this.dependencyMap.clear();
    this.stats = { totalRequests: 0, cacheHits: 0, cacheMisses: 0 };
  }

  // Private helper methods
  private isEntryValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private updateAccessMetrics(entry: CacheEntry<any>): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  private setInL1(key: string, entry: CacheEntry<any>): void {
    if (this.l1Cache.size >= this.L1_MAX_SIZE) {
      this.evictFromL1();
    }
    this.l1Cache.set(key, { ...entry, ttl: this.L1_TTL });
  }

  private promoteToL1(key: string, entry: CacheEntry<any>): void {
    this.l2Cache.delete(key);
    this.setInL1(key, entry);
  }

  private promoteToL2(key: string, entry: CacheEntry<any>): void {
    this.l3Cache.delete(key);
    if (this.l2Cache.size >= this.L2_MAX_SIZE) {
      this.evictFromL2();
    }
    this.l2Cache.set(key, { ...entry, ttl: this.L2_TTL });
  }

  private evictFromL1(): void {
    const lruKey = this.findLRUKey(this.l1Cache);
    if (lruKey) {
      const entry = this.l1Cache.get(lruKey)!;
      this.l1Cache.delete(lruKey);
      
      // Demote to L2 if still valuable
      if (entry.accessCount > 1) {
        this.l2Cache.set(lruKey, { ...entry, ttl: this.L2_TTL });
      }
    }
  }

  private evictFromL2(): void {
    const lruKey = this.findLRUKey(this.l2Cache);
    if (lruKey) {
      const entry = this.l2Cache.get(lruKey)!;
      this.l2Cache.delete(lruKey);
      
      // Demote to L3 if still valuable
      if (entry.accessCount > 2) {
        this.l3Cache.set(lruKey, { ...entry, ttl: this.L3_TTL });
      }
    }
  }

  private findLRUKey(cache: Map<string, CacheEntry<any>>): string | null {
    let lruKey: string | null = null;
    let oldestTime = Date.now();
    
    cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        lruKey = key;
      }
    });
    
    return lruKey;
  }

  private updateDependencyMap(key: string, dependencies: string[]): void {
    this.dependencyMap.set(key, new Set(dependencies));
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    let usage = 0;
    [this.l1Cache, this.l2Cache, this.l3Cache].forEach(cache => {
      cache.forEach((entry, key) => {
        usage += key.length * 2; // String key
        usage += JSON.stringify(entry.value).length * 2; // Entry value
        usage += 64; // Entry metadata
      });
    });
    return usage;
  }
}

export const advancedCacheManager = AdvancedCacheManager.getInstance();
