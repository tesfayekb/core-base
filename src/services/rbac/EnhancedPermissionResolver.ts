
import { supabase } from '../database/connection';
import { granularDependencyResolver } from './GranularDependencyResolver';
import { EntityBoundaryValidator } from './entityBoundaries';
import { advancedCacheManager } from './AdvancedCacheManager';

export interface PermissionResolutionResult {
  granted: boolean;
  reason: string;
  dependencies: string[];
  resolutionTime: number;
  cacheHit: boolean;
}

export interface PermissionContext {
  tenantId?: string;
  entityId?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export class EnhancedPermissionResolver {
  private static instance: EnhancedPermissionResolver;
  
  // Add missing property declarations
  private entityBoundaryCache = new Map<string, { valid: boolean; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private performanceMetrics = new Map<string, number[]>();

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
    const cacheKey = this.buildCacheKey(userId, action, resource, context);
    
    // Check advanced cache first
    const cachedResult = advancedCacheManager.get<{ result: boolean; dependencies: string[] }>(cacheKey);
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
      if (await this.isSuperAdmin(userId)) {
        const result = {
          granted: true,
          reason: 'SuperAdmin bypass',
          dependencies: [],
          resolutionTime: performance.now() - startTime,
          cacheHit: false
        };
        this.cacheResult(cacheKey, result, userId);
        return result;
      }

      // Entity boundary validation
      const entityValid = await this.validateEntityBoundary(userId, context);
      if (!entityValid) {
        const result = {
          granted: false,
          reason: 'Entity boundary violation',
          dependencies: [],
          resolutionTime: performance.now() - startTime,
          cacheHit: false
        };
        this.cacheResult(cacheKey, result, userId);
        return result;
      }

      // Enhanced dependency resolution
      const dependencyResult = await granularDependencyResolver.resolvePermissionWithDependencies(
        userId,
        `${action}:${resource}`,
        async (uid: string, permission: string) => {
          const [permAction, permResource] = permission.split(':');
          return this.hasDirectPermission(uid, permAction, permResource, context);
        }
      );

      const result = {
        granted: dependencyResult.granted,
        reason: dependencyResult.granted ? 'Permission granted via dependency resolution' : 'Permission denied',
        dependencies: dependencyResult.resolutionPath,
        resolutionTime: performance.now() - startTime,
        cacheHit: false
      };

      this.cacheResult(cacheKey, result, userId);
      this.recordPerformanceMetric(action, result.resolutionTime);

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

  private async hasDirectPermission(
    userId: string,
    action: string,
    resource: string,
    context: PermissionContext
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: userId,
        p_action: action,
        p_resource: resource,
        p_resource_id: context.resourceId || null
      });

      if (error) {
        console.error('Direct permission check error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Direct permission check failed:', error);
      return false;
    }
  }

  private async validateEntityBoundary(
    userId: string,
    context: PermissionContext
  ): Promise<boolean> {
    if (!context.entityId && !context.tenantId) {
      return true;
    }

    const boundaryKey = `${userId}:${context.entityId || context.tenantId}`;
    const cached = this.entityBoundaryCache.get(boundaryKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.valid;
    }

    try {
      const isValid = await EntityBoundaryValidator.validateEntityBoundary(
        {
          userId,
          entityId: context.entityId || context.tenantId || '',
          operation: 'permission_check'
        },
        async (uid: string, permission: string) => {
          const [action, resource] = permission.split(':');
          return this.hasDirectPermission(uid, action, resource, context);
        }
      );

      this.entityBoundaryCache.set(boundaryKey, {
        valid: isValid,
        timestamp: Date.now()
      });

      return isValid;
    } catch (error) {
      console.error('Entity boundary validation failed:', error);
      return false;
    }
  }

  private async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          roles!inner (
            name
          )
        `)
        .eq('user_id', userId)
        .eq('roles.name', 'SuperAdmin')
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('SuperAdmin check failed:', error);
      return false;
    }
  }

  private buildCacheKey(
    userId: string,
    action: string,
    resource: string,
    context: PermissionContext
  ): string {
    const contextStr = JSON.stringify({
      tenantId: context.tenantId,
      entityId: context.entityId,
      resourceId: context.resourceId
    });
    return `perm:${userId}:${action}:${resource}:${btoa(contextStr)}`;
  }

  private cacheResult(cacheKey: string, result: PermissionResolutionResult, userId: string): void {
    const dependencies = [
      `user:${userId}`,
      `resource:${cacheKey.split(':')[3]}`, // resource from cache key
      ...result.dependencies.map(dep => `dep:${dep}`)
    ];

    advancedCacheManager.set(
      cacheKey,
      { result: result.granted, dependencies: result.dependencies },
      300000, // 5 minutes TTL
      dependencies
    );
  }

  private recordPerformanceMetric(action: string, resolutionTime: number): void {
    if (!this.performanceMetrics.has(action)) {
      this.performanceMetrics.set(action, []);
    }
    const metrics = this.performanceMetrics.get(action)!;
    metrics.push(resolutionTime);
    
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  getPerformanceStats(): Record<string, { avg: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; max: number; count: number }> = {};
    
    for (const [action, times] of this.performanceMetrics.entries()) {
      if (times.length > 0) {
        stats[action] = {
          avg: times.reduce((sum, time) => sum + time, 0) / times.length,
          max: Math.max(...times),
          count: times.length
        };
      }
    }
    
    return stats;
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
