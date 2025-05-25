
// Advanced Cache Manager - Refactored
import { CacheStats } from './caching/CacheLevel';
import { L1MemoryCache } from './caching/L1MemoryCache';

export class AdvancedCacheManager {
  private static instance: AdvancedCacheManager;
  private l1Cache = new L1MemoryCache();
  private dependencies = new Map<string, Set<string>>();

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

  getStats(): CacheStats {
    const l1Stats = this.l1Cache.getStats();
    const hitRate = l1Stats.hits + l1Stats.misses > 0 
      ? (l1Stats.hits / (l1Stats.hits + l1Stats.misses)) * 100 
      : 0;

    return {
      totalEntries: l1Stats.size,
      memoryUsage: l1Stats.size * 1024,
      hitRate,
      totalRequests: l1Stats.hits + l1Stats.misses,
      cacheHits: l1Stats.hits,
      cacheMisses: l1Stats.misses,
      lastCleanup: Date.now()
    };
  }

  async warmCache(
    items: any[],
    loadFunction: (userId: string, action: string, resource: string, context?: any) => Promise<boolean>
  ): Promise<void> {
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
}

export const advancedCacheManager = AdvancedCacheManager.getInstance();
