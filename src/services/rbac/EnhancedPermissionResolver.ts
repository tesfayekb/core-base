import { granularDependencyResolver } from './GranularDependencyResolver';
import { PermissionCache } from './PermissionCache';
import { PermissionValidator, PermissionContext } from './PermissionValidator';
import { PermissionMetrics } from './PermissionMetrics';
import { advancedCacheManager } from './AdvancedCacheManager';
import { advancedPermissionDependencyResolver } from './AdvancedPermissionDependencyResolver';
import { EntityBoundaryValidator } from './EntityBoundaryValidator';
import { smartCacheInvalidationService } from './SmartCacheInvalidationService';
import { cachePerformanceMonitor } from './CachePerformanceMonitor';

export interface PermissionResolutionResult {
  granted: boolean;
  reason: string;
  dependencies: string[];
  resolutionTime: number;
  cacheHit: boolean;
  dependencyChain?: string[];
  missingDependencies?: string[];
}

export type { PermissionContext };

export class EnhancedPermissionResolver {
  private static instance: EnhancedPermissionResolver;
  private cache: PermissionCache;
  private validator: PermissionValidator;
  private metrics: PermissionMetrics;

  private constructor() {
    this.cache = new PermissionCache();
    this.validator = new PermissionValidator(this.cache);
    this.metrics = new PermissionMetrics();
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
    const startTime = performance.now();
    const cacheKey = this.cache.buildCacheKey(userId, action, resource, context);
    
    // Record cache request for performance monitoring
    this.recordCacheRequest();
    
    // Check advanced cache first
    const cachedResult = this.cache.getCachedPermission(cacheKey);
    if (cachedResult) {
      this.recordCacheHit();
      return {
        granted: cachedResult.result,
        reason: 'Advanced cache hit',
        dependencies: cachedResult.dependencies,
        resolutionTime: performance.now() - startTime,
        cacheHit: true
      };
    }

    this.recordCacheMiss();

    try {
      // SuperAdmin check (fast path)
      if (await this.validator.isSuperAdmin(userId)) {
        const result = {
          granted: true,
          reason: 'SuperAdmin bypass',
          dependencies: [],
          resolutionTime: performance.now() - startTime,
          cacheHit: false
        };
        this.cache.cachePermissionResult(cacheKey, result.granted, result.dependencies, userId);
        return result;
      }

      // Entity boundary validation
      if (context.entityId || context.tenantId) {
        const isValidBoundary = await EntityBoundaryValidator.validateEntityBoundary(
          {
            userId,
            entityId: context.entityId || context.tenantId || '',
            operation: 'permission_check',
            metadata: context.metadata
          },
          async (uid: string, permission: string) => {
            const [permAction, permResource] = permission.split(':');
            return this.validator.hasDirectPermission(uid, permAction, permResource, context);
          }
        );

        if (!isValidBoundary) {
          const result = {
            granted: false,
            reason: 'Entity boundary violation',
            dependencies: [],
            resolutionTime: performance.now() - startTime,
            cacheHit: false
          };
          this.cache.cachePermissionResult(cacheKey, result.granted, result.dependencies, userId);
          return result;
        }
      }

      // Enhanced dependency resolution with advanced resolver
      const dependencyResult = await advancedPermissionDependencyResolver.resolvePermissionWithAdvancedDependencies(
        userId,
        action,
        resource,
        context.resourceId,
        {
          tenantId: context.tenantId,
          entityId: context.entityId,
          resourceId: context.resourceId,
          metadata: context.metadata
        },
        async (uid: string, permAction: string, permResource: string, permResourceId?: string) => {
          return this.validator.hasDirectPermission(uid, permAction, permResource, {
            ...context,
            resourceId: permResourceId
          });
        }
      );

      const result: PermissionResolutionResult = {
        granted: dependencyResult.granted,
        reason: dependencyResult.reason,
        dependencies: dependencyResult.dependencyChain,
        resolutionTime: performance.now() - startTime,
        cacheHit: false,
        dependencyChain: dependencyResult.dependencyChain,
        missingDependencies: dependencyResult.missingDependencies
      };

      this.cache.cachePermissionResult(cacheKey, result.granted, result.dependencies, userId);
      this.metrics.recordPerformanceMetric(action, result.resolutionTime);

      return result;

    } catch (error) {
      console.error('Enhanced permission resolution failed:', error);
      return {
        granted: false,
        reason: `Resolution error: ${error}`,
        dependencies: [],
        resolutionTime: performance.now() - startTime,
        cacheHit: false
      };
    }
  }

  private recordCacheRequest(): void {
    // This would be integrated with the performance monitor
    // For now, we'll let the AdvancedCacheManager handle the stats
  }

  private recordCacheHit(): void {
    // Performance monitoring integration
  }

  private recordCacheMiss(): void {
    // Performance monitoring integration
  }

  getPerformanceStats(): Record<string, { avg: number; max: number; count: number }> {
    return this.metrics.getPerformanceStats();
  }

  invalidateUserCache(userId: string): void {
    // Enhanced invalidation with smart cascade
    smartCacheInvalidationService.invalidateUserPermissions(
      userId,
      'Manual cache invalidation'
    );
    
    this.cache.invalidateUserCache(userId);
    advancedPermissionDependencyResolver.clearCache(userId);
    EntityBoundaryValidator.clearCache(userId);
  }

  getCacheStats(): { 
    permissionCacheSize: number; 
    entityCacheSize: number; 
    hitRate: number; 
  } {
    return this.cache.getCacheStats();
  }

  async warmCommonPermissions(userIds: string[]): Promise<void> {
    const commonPermissions = [];
    
    // Common permission patterns to warm
    const actions = ['view', 'edit', 'delete', 'manage'];
    const resources = ['users', 'roles', 'documents', 'settings'];
    
    for (const userId of userIds) {
      for (const action of actions) {
        for (const resource of resources) {
          commonPermissions.push({
            userId,
            action,
            resource
          });
        }
      }
    }

    await advancedCacheManager.warmCache(
      commonPermissions,
      async (userId, action, resource, context) => {
        const result = await this.resolvePermission(userId, action, resource, context);
        return result.granted;
      }
    );
  }

  getDependencyMetrics(): {
    granularMetrics: any;
    advancedMetrics: any;
  } {
    return {
      granularMetrics: granularDependencyResolver.getMetrics(),
      advancedMetrics: advancedPermissionDependencyResolver.getMetrics()
    };
  }

  /**
   * Get comprehensive performance report
   */
  getComprehensivePerformanceReport(): {
    resolutionStats: any;
    cacheStats: any;
    dependencyMetrics: any;
    performanceTargetsMet: boolean;
  } {
    const resolutionStats = this.getPerformanceStats();
    const cacheStats = this.getCacheStats();
    const dependencyMetrics = this.getDependencyMetrics();
    const currentMetrics = cachePerformanceMonitor.getCurrentMetrics();
    
    return {
      resolutionStats,
      cacheStats,
      dependencyMetrics,
      performanceTargetsMet: currentMetrics ? currentMetrics.isTargetMet : false
    };
  }
}

export const enhancedPermissionResolver = EnhancedPermissionResolver.getInstance();
