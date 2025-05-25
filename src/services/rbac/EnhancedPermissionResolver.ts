
import { granularDependencyResolver } from './GranularDependencyResolver';
import { PermissionCache } from './PermissionCache';
import { PermissionValidator, PermissionContext } from './PermissionValidator';
import { PermissionMetrics } from './PermissionMetrics';
import { advancedCacheManager } from './AdvancedCacheManager';

export interface PermissionResolutionResult {
  granted: boolean;
  reason: string;
  dependencies: string[];
  resolutionTime: number;
  cacheHit: boolean;
}

export { PermissionContext };

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
    
    // Check advanced cache first
    const cachedResult = this.cache.getCachedPermission(cacheKey);
    if (cachedResult) {
      return {
        granted: cachedResult.result,
        reason: 'Advanced cache hit',
        dependencies: cachedResult.dependencies,
        resolutionTime: performance.now() - startTime,
        cacheHit: true
      };
    }

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
      const entityValid = await this.validator.validateEntityBoundary(userId, context);
      if (!entityValid) {
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

      // Enhanced dependency resolution
      const dependencyResult = await granularDependencyResolver.resolvePermissionWithDependencies(
        userId,
        `${action}:${resource}`,
        async (uid: string, permission: string) => {
          const [permAction, permResource] = permission.split(':');
          return this.validator.hasDirectPermission(uid, permAction, permResource, context);
        }
      );

      const result = {
        granted: dependencyResult.granted,
        reason: dependencyResult.granted ? 'Permission granted via dependency resolution' : 'Permission denied',
        dependencies: dependencyResult.resolutionPath,
        resolutionTime: performance.now() - startTime,
        cacheHit: false
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

  getPerformanceStats(): Record<string, { avg: number; max: number; count: number }> {
    return this.metrics.getPerformanceStats();
  }

  invalidateUserCache(userId: string): void {
    this.cache.invalidateUserCache(userId);
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
}

export const enhancedPermissionResolver = EnhancedPermissionResolver.getInstance();
