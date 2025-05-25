
// Enhanced Permission Resolver - Refactored
import { PermissionResolutionResult, PermissionContext } from './resolution/PermissionTypes';
import { CoreResolver } from './resolution/CoreResolver';
import { PermissionCache } from './PermissionCache';
import { PermissionValidator } from './PermissionValidator';
import { PermissionMetrics } from './PermissionMetrics';
import { smartCacheInvalidationService } from './SmartCacheInvalidationService';

export class EnhancedPermissionResolver {
  private static instance: EnhancedPermissionResolver;
  private cache: PermissionCache;
  private validator: PermissionValidator;
  private metrics: PermissionMetrics;
  private coreResolver: CoreResolver;

  private constructor() {
    this.cache = new PermissionCache();
    this.validator = new PermissionValidator(this.cache);
    this.metrics = new PermissionMetrics();
    this.coreResolver = new CoreResolver(this.validator, this.cache);
  }

  static getInstance(): EnhancedPermissionResolver {
    if (!EnhancedPermissionResolver.instance) {
      EnhancedPermissionResolver.instance = new EnhancedPermissionResolver();
    }
    return EnhancedPermissionResolver.instance;
  }

  async resolvePermission(
    userId: string,
    action: string,
    resource: string,
    context: PermissionContext = {}
  ): Promise<PermissionResolutionResult> {
    const cacheKey = this.cache.buildCacheKey(userId, action, resource, context);
    
    const cachedResult = await this.cache.getCachedPermission(cacheKey);
    if (cachedResult) {
      return {
        granted: cachedResult.result,
        reason: 'Cache hit',
        dependencies: cachedResult.dependencies,
        resolutionTime: 0.5,
        cacheHit: true
      };
    }

    const result = await this.coreResolver.resolveBasicPermission(
      userId,
      action,
      resource,
      context
    );

    await this.cache.cachePermissionResult(cacheKey, result.granted, result.dependencies, userId);
    this.metrics.recordPerformanceMetric(action, result.resolutionTime);

    return result;
  }

  invalidateUserCache(userId: string): void {
    smartCacheInvalidationService.invalidateUserPermissions(
      userId,
      'Manual cache invalidation'
    );
    this.cache.invalidateUserCache(userId);
  }

  getPerformanceStats(): Record<string, { avg: number; max: number; count: number }> {
    return this.metrics.getPerformanceStats();
  }

  getCacheStats(): { 
    permissionCacheSize: number; 
    entityCacheSize: number; 
    hitRate: number; 
  } {
    return this.cache.getCacheStats();
  }
}

export const enhancedPermissionResolver = EnhancedPermissionResolver.getInstance();
export type { PermissionContext, PermissionResolutionResult };
