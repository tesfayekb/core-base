import { advancedCacheManager } from './AdvancedCacheManager';
import { cacheMemoryMonitor } from './caching/CacheMemoryMonitor';
import { standardErrorHandler } from '../error/standardErrorHandler';

export interface PermissionCacheEntry {
  result: boolean;
  dependencies: string[];
}

export class PermissionCache {
  private entityBoundaryCache = new Map<string, { valid: boolean; timestamp: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private readonly maxEntityCacheSize = 1000; // Limit entity boundary cache size

  buildCacheKey(
    userId: string,
    action: string,
    resource: string,
    context: Record<string, any>
  ): string {
    try {
      const contextStr = JSON.stringify({
        tenantId: context.tenantId,
        entityId: context.entityId,
        resourceId: context.resourceId
      });
      return `perm:${userId}:${action}:${resource}:${btoa(contextStr)}`;
    } catch (error) {
      standardErrorHandler.handleError(
        error as Error,
        'cache_key_generation',
        { showToast: false, logError: true }
      );
      // Fallback to simple key
      return `perm:${userId}:${action}:${resource}:fallback`;
    }
  }

  async getCachedPermission(cacheKey: string): Promise<PermissionCacheEntry | null> {
    try {
      const cached = await advancedCacheManager.get(cacheKey);
      return cached as PermissionCacheEntry | null;
    } catch (error) {
      standardErrorHandler.handleError(
        error as Error,
        'cache_retrieval',
        { showToast: false, logError: true }
      );
      return null;
    }
  }

  async cachePermissionResult(
    cacheKey: string,
    result: boolean,
    dependencies: string[],
    userId: string
  ): Promise<void> {
    try {
      const dependencyList = [
        `user:${userId}`,
        `resource:${cacheKey.split(':')[3]}`,
        ...dependencies.map(dep => `dep:${dep}`)
      ];

      await advancedCacheManager.set(
        cacheKey,
        { result, dependencies },
        300000, // 5 minutes TTL
        dependencyList
      );
    } catch (error) {
      standardErrorHandler.handleError(
        error as Error,
        'cache_storage',
        { showToast: false, logError: true }
      );
    }
  }

  getEntityBoundaryCache(boundaryKey: string): { valid: boolean; timestamp: number } | undefined {
    try {
      const cached = this.entityBoundaryCache.get(boundaryKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached;
      }
      
      // Clean up expired entry
      if (cached) {
        this.entityBoundaryCache.delete(boundaryKey);
      }
      return undefined;
    } catch (error) {
      standardErrorHandler.handleError(
        error as Error,
        'entity_boundary_cache',
        { showToast: false, logError: true }
      );
      return undefined;
    }
  }

  setEntityBoundaryCache(boundaryKey: string, isValid: boolean): void {
    try {
      // Enforce size limit
      this.enforceEntityCacheSize();
      
      this.entityBoundaryCache.set(boundaryKey, {
        valid: isValid,
        timestamp: Date.now()
      });
    } catch (error) {
      standardErrorHandler.handleError(
        error as Error,
        'entity_boundary_cache_set',
        { showToast: false, logError: true }
      );
    }
  }

  private enforceEntityCacheSize(): void {
    if (this.entityBoundaryCache.size >= this.maxEntityCacheSize) {
      // Remove oldest entries (first 10% of cache)
      const entriesToRemove = Math.floor(this.maxEntityCacheSize * 0.1);
      const keys = Array.from(this.entityBoundaryCache.keys());
      
      for (let i = 0; i < entriesToRemove && i < keys.length; i++) {
        this.entityBoundaryCache.delete(keys[i]);
      }
    }
  }

  invalidateUserCache(userId: string): void {
    try {
      advancedCacheManager.invalidateByDependency(`user:${userId}`);
    } catch (error) {
      standardErrorHandler.handleError(
        error as Error,
        'cache_invalidation',
        { showToast: false, logError: true }
      );
    }
  }

  getCacheStats(): { 
    permissionCacheSize: number; 
    entityCacheSize: number; 
    hitRate: number;
    memoryStats: any;
  } {
    try {
      const cacheStats = advancedCacheManager.getStats();
      const memoryStats = cacheMemoryMonitor.getCacheMemoryStats(
        cacheStats.totalEntries + this.entityBoundaryCache.size
      );
      
      return {
        permissionCacheSize: cacheStats.totalEntries,
        entityCacheSize: this.entityBoundaryCache.size,
        hitRate: cacheStats.hitRate,
        memoryStats
      };
    } catch (error) {
      standardErrorHandler.handleError(
        error as Error,
        'cache_stats',
        { showToast: false, logError: true }
      );
      return {
        permissionCacheSize: 0,
        entityCacheSize: 0,
        hitRate: 0,
        memoryStats: {}
      };
    }
  }

  performMemoryCleanup(): void {
    try {
      // Clean up expired entity boundary cache entries
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      for (const [key, entry] of this.entityBoundaryCache.entries()) {
        if (now - entry.timestamp > this.cacheTimeout) {
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => this.entityBoundaryCache.delete(key));
      
      // Record memory usage
      cacheMemoryMonitor.recordMemoryUsage();
    } catch (error) {
      standardErrorHandler.handleError(
        error as Error,
        'memory_cleanup',
        { showToast: false, logError: true }
      );
    }
  }

  getMemoryRecommendations(): string[] {
    try {
      return cacheMemoryMonitor.getMemoryRecommendations();
    } catch (error) {
      standardErrorHandler.handleError(
        error as Error,
        'memory_recommendations',
        { showToast: false, logError: true }
      );
      return ['Error retrieving memory recommendations'];
    }
  }
}
