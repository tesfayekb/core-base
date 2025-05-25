
// Advanced Cache Manager - Refactored with memory management
import { CacheStats } from './caching/CacheLevel';
import { L1MemoryCache } from './caching/L1MemoryCache';
import { cacheMemoryMonitor } from './caching/CacheMemoryMonitor';

export class AdvancedCacheManager {
  private static instance: AdvancedCacheManager;
  private l1Cache = new L1MemoryCache({
    maxSize: 2000,
    maxMemoryBytes: 100 * 1024 * 1024, // 100MB
    defaultTtl: 300000
  });
  private dependencies = new Map<string, Set<string>>();
  private readonly maxDependencies = 5000; // Limit dependency tracking

  static getInstance(): AdvancedCacheManager {
    if (!AdvancedCacheManager.instance) {
      AdvancedCacheManager.instance = new AdvancedCacheManager();
    }
    return AdvancedCacheManager.instance;
  }

  async get(key: string): Promise<any> {
    return this.l1Cache.get(key);
  }

  async set(key: string, value: any, ttl: number = 300000, dependencies: string[] = []): Promise<void> {
    this.l1Cache.set(key, value, ttl);
    
    // Enforce dependency tracking limits
    this.enforceDependencyLimits();
    
    dependencies.forEach(dep => {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep)!.add(key);
    });
  }

  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
  }

  invalidateByDependency(dependency: string): void {
    const dependentKeys = this.dependencies.get(dependency);
    if (dependentKeys) {
      dependentKeys.forEach(key => this.l1Cache.delete(key));
      this.dependencies.delete(dependency);
    }
  }

  private enforceDependencyLimits(): void {
    if (this.dependencies.size > this.maxDependencies) {
      // Remove oldest 10% of dependency mappings
      const keysToRemove = Math.floor(this.maxDependencies * 0.1);
      const keys = Array.from(this.dependencies.keys());
      
      for (let i = 0; i < keysToRemove && i < keys.length; i++) {
        this.dependencies.delete(keys[i]);
      }
    }
  }

  getStats(): CacheStats {
    const l1Stats = this.l1Cache.getStats();
    const memoryStats = cacheMemoryMonitor.getCacheMemoryStats(l1Stats.size);

    return {
      totalEntries: l1Stats.size,
      memoryUsage: l1Stats.memoryUsage,
      hitRate: l1Stats.hitRate,
      totalRequests: l1Stats.hits + l1Stats.misses,
      cacheHits: l1Stats.hits,
      cacheMisses: l1Stats.misses,
      lastCleanup: Date.now(),
      evictions: l1Stats.evictions,
      memoryPressure: memoryStats.memoryUsagePercentage > 0.8
    };
  }

  async warmCache(
    items: any[],
    loadFunction: (userId: string, action: string, resource: string, context?: any) => Promise<boolean>
  ): Promise<void> {
    // Check memory pressure before warming
    if (cacheMemoryMonitor.isMemoryPressure()) {
      console.warn('Skipping cache warming due to memory pressure');
      return;
    }

    for (const item of items) {
      try {
        const result = await loadFunction(item.userId, item.action, item.resource, item.context);
        const key = `${item.userId}:${item.action}:${item.resource}`;
        await this.set(key, result, 300000, [`user:${item.userId}`]);
      } catch (error) {
        console.error(`Failed to warm cache for ${item.userId}:${item.action}:${item.resource}`, error);
      }
    }
  }

  performMemoryCleanup(): void {
    // Force cleanup of L1 cache
    this.l1Cache.clear();
    
    // Clear dependency mappings
    this.dependencies.clear();
    
    // Record memory usage
    cacheMemoryMonitor.recordMemoryUsage();
  }

  getMemoryStats() {
    const l1Stats = this.l1Cache.getStats();
    return cacheMemoryMonitor.getCacheMemoryStats(l1Stats.size);
  }
}

export const advancedCacheManager = AdvancedCacheManager.getInstance();
