
// Advanced Permission Dependency Resolver
// Enhanced implementation with complex dependency chains and performance optimization

import { PermissionDependencyResolver } from './permissionDependencies';
import { granularDependencyResolver } from './GranularDependencyResolver';

export interface AdvancedDependencyContext {
  tenantId?: string;
  entityId?: string;
  resourceId?: string;
  timeContext?: Date;
  metadata?: Record<string, any>;
}

export interface DependencyResolutionResult {
  granted: boolean;
  reason: string;
  dependencyChain: string[];
  resolutionTime: number;
  cacheHit: boolean;
  missingDependencies?: string[];
}

export class AdvancedPermissionDependencyResolver {
  private static instance: AdvancedPermissionDependencyResolver;
  private resolutionCache = new Map<string, { result: DependencyResolutionResult; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  static getInstance(): AdvancedPermissionDependencyResolver {
    if (!AdvancedPermissionDependencyResolver.instance) {
      AdvancedPermissionDependencyResolver.instance = new AdvancedPermissionDependencyResolver();
    }
    return AdvancedPermissionDependencyResolver.instance;
  }

  async resolvePermissionWithAdvancedDependencies(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    context?: AdvancedDependencyContext,
    hasPermissionFn?: (userId: string, action: string, resource: string, resourceId?: string) => Promise<boolean>
  ): Promise<DependencyResolutionResult> {
    const startTime = performance.now();
    const cacheKey = this.buildCacheKey(userId, action, resource, resourceId, context);
    
    // Check cache first
    const cached = this.resolutionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        ...cached.result,
        cacheHit: true,
        resolutionTime: performance.now() - startTime
      };
    }

    try {
      // Use default permission check function if none provided
      const permissionChecker = hasPermissionFn || this.defaultPermissionChecker;

      // 1. Check basic permission dependencies using existing resolver
      const basicResult = await PermissionDependencyResolver.checkPermissionWithDependencies(
        async (action: string, resource: string, resourceId?: string) => 
          permissionChecker(userId, action, resource, resourceId),
        action,
        resource,
        resourceId
      );

      if (basicResult) {
        const result: DependencyResolutionResult = {
          granted: true,
          reason: 'Basic permission dependency resolved',
          dependencyChain: [`${action}:${resource}`],
          resolutionTime: performance.now() - startTime,
          cacheHit: false
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // 2. Check granular dependencies using granular resolver
      const granularResult = await granularDependencyResolver.resolvePermissionWithDependencies(
        userId,
        `${action}:${resource}`,
        async (uid: string, permission: string) => {
          const [permAction, permResource] = permission.split(':');
          return permissionChecker(uid, permAction, permResource, resourceId);
        }
      );

      if (granularResult.granted) {
        const result: DependencyResolutionResult = {
          granted: true,
          reason: 'Granular permission dependency resolved',
          dependencyChain: granularResult.resolutionPath,
          resolutionTime: performance.now() - startTime,
          cacheHit: false
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // 3. Check contextual dependencies
      if (context) {
        const contextualResult = await this.resolveContextualDependencies(
          userId,
          action,
          resource,
          context,
          permissionChecker
        );

        if (contextualResult.granted) {
          const result: DependencyResolutionResult = {
            granted: contextualResult.granted,
            reason: contextualResult.reason,
            dependencyChain: contextualResult.dependencyChain,
            resolutionTime: performance.now() - startTime,
            cacheHit: false
          };
          this.cacheResult(cacheKey, result);
          return result;
        }
      }

      // No permission found
      const result: DependencyResolutionResult = {
        granted: false,
        reason: 'No applicable permission or dependency found',
        dependencyChain: [],
        resolutionTime: performance.now() - startTime,
        cacheHit: false,
        missingDependencies: granularResult.missingDependencies
      };

      this.cacheResult(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Advanced permission dependency resolution failed:', error);
      return {
        granted: false,
        reason: `Resolution error: ${error}`,
        dependencyChain: [],
        resolutionTime: performance.now() - startTime,
        cacheHit: false
      };
    }
  }

  private async resolveContextualDependencies(
    userId: string,
    action: string,
    resource: string,
    context: AdvancedDependencyContext,
    hasPermissionFn: (userId: string, action: string, resource: string, resourceId?: string) => Promise<boolean>
  ): Promise<{ granted: boolean; reason: string; dependencyChain: string[] }> {
    const dependencyChain: string[] = [];

    // Time-based dependencies
    if (context.timeContext) {
      const timeBasedPermissions = this.getTimeBasedDependencies(action, resource, context.timeContext);
      for (const timePerm of timeBasedPermissions) {
        if (await hasPermissionFn(userId, timePerm.action, timePerm.resource)) {
          dependencyChain.push(`${timePerm.action}:${timePerm.resource}`);
          return {
            granted: true,
            reason: 'Time-based contextual dependency resolved',
            dependencyChain
          };
        }
      }
    }

    // Entity-based dependencies
    if (context.entityId) {
      const entityPermissions = [`view:entity:${context.entityId}`, `manage:entity:${context.entityId}`];
      for (const entityPerm of entityPermissions) {
        const [entityAction, entityResource] = entityPerm.split(':');
        if (await hasPermissionFn(userId, entityAction, entityResource, context.entityId)) {
          dependencyChain.push(entityPerm);
          return {
            granted: true,
            reason: 'Entity-based contextual dependency resolved',
            dependencyChain
          };
        }
      }
    }

    return { 
      granted: false, 
      reason: 'No contextual dependencies found',
      dependencyChain 
    };
  }

  private getTimeBasedDependencies(action: string, resource: string, timeContext: Date): Array<{action: string, resource: string}> {
    // Implement time-based dependency logic
    const hour = timeContext.getHours();
    const isBusinessHours = hour >= 9 && hour <= 17;
    
    if (!isBusinessHours && action === 'delete') {
      return [
        { action: 'emergency_delete', resource },
        { action: 'admin_override', resource: 'system' }
      ];
    }
    
    return [];
  }

  private async defaultPermissionChecker(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    // This would typically call the actual permission service
    // For now, return false as a safe default
    console.warn('Using default permission checker - should be replaced with actual implementation');
    return false;
  }

  private buildCacheKey(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    context?: AdvancedDependencyContext
  ): string {
    const baseKey = `${userId}:${action}:${resource}:${resourceId || 'null'}`;
    if (!context) return baseKey;
    
    const contextStr = JSON.stringify({
      tenantId: context.tenantId,
      entityId: context.entityId,
      timeContext: context.timeContext?.getTime()
    });
    
    return `${baseKey}:${btoa(contextStr)}`;
  }

  private cacheResult(cacheKey: string, result: DependencyResolutionResult): void {
    this.resolutionCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  clearCache(userId?: string): void {
    if (userId) {
      for (const [key] of this.resolutionCache) {
        if (key.startsWith(`${userId}:`)) {
          this.resolutionCache.delete(key);
        }
      }
    } else {
      this.resolutionCache.clear();
    }
  }

  getMetrics(): {
    cacheSize: number;
    cacheHitRate: number;
  } {
    // Simple metrics implementation
    return {
      cacheSize: this.resolutionCache.size,
      cacheHitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }
}

export const advancedPermissionDependencyResolver = AdvancedPermissionDependencyResolver.getInstance();
