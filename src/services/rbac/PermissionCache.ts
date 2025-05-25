
import { advancedCacheManager } from './AdvancedCacheManager';

export interface PermissionCacheEntry {
  result: boolean;
  dependencies: string[];
}

export class PermissionCache {
  private entityBoundaryCache = new Map<string, { valid: boolean; timestamp: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  buildCacheKey(
    userId: string,
    action: string,
    resource: string,
    context: Record<string, any>
  ): string {
    const contextStr = JSON.stringify({
      tenantId: context.tenantId,
      entityId: context.entityId,
      resourceId: context.resourceId
    });
    return `perm:${userId}:${action}:${resource}:${btoa(contextStr)}`;
  }

  getCachedPermission(cacheKey: string): PermissionCacheEntry | null {
    return advancedCacheManager.get<PermissionCacheEntry>(cacheKey);
  }

  cachePermissionResult(
    cacheKey: string,
    result: boolean,
    dependencies: string[],
    userId: string
  ): void {
    const dependencyList = [
      `user:${userId}`,
      `resource:${cacheKey.split(':')[3]}`,
      ...dependencies.map(dep => `dep:${dep}`)
    ];

    advancedCacheManager.set(
      cacheKey,
      { result, dependencies },
      300000, // 5 minutes TTL
      dependencyList
    );
  }

  getEntityBoundaryCache(boundaryKey: string): { valid: boolean; timestamp: number } | undefined {
    const cached = this.entityBoundaryCache.get(boundaryKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached;
    }
    return undefined;
  }

  setEntityBoundaryCache(boundaryKey: string, isValid: boolean): void {
    this.entityBoundaryCache.set(boundaryKey, {
      valid: isValid,
      timestamp: Date.now()
    });
  }

  invalidateUserCache(userId: string): void {
    advancedCacheManager.invalidateByDependency(`user:${userId}`);
  }

  getCacheStats(): { 
    permissionCacheSize: number; 
    entityCacheSize: number; 
    hitRate: number; 
  } {
    const cacheStats = advancedCacheManager.getStats();
    return {
      permissionCacheSize: cacheStats.totalEntries,
      entityCacheSize: this.entityBoundaryCache.size,
      hitRate: cacheStats.hitRate
    };
  }
}
