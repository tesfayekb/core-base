
import { SmartCacheInvalidation } from './smart-cache-invalidation';
import { BatchPermissionChecker } from './batch-permission-checker';
import { OptimizedPermissionResolver } from './optimized-permission-resolver';

export class EnhancedRBACService {
  private cacheInvalidation: SmartCacheInvalidation;
  private batchChecker: BatchPermissionChecker;
  private permissionResolver: OptimizedPermissionResolver;

  constructor(
    private cacheService: any,
    private permissionService: any
  ) {
    this.cacheInvalidation = new SmartCacheInvalidation(cacheService);
    this.batchChecker = new BatchPermissionChecker(cacheService, permissionService);
    this.permissionResolver = new OptimizedPermissionResolver(this.batchChecker);
  }

  // Enhanced permission checking with all optimizations
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    tenantId?: string
  ): Promise<boolean> {
    const permission = `${resource}:${action}`;
    const results = await this.permissionResolver.resolveComplexPermissions(
      userId,
      [permission],
      tenantId
    );
    
    return results[permission] || false;
  }

  // Batch permission checking for UI components
  async checkMultiplePermissions(
    userId: string,
    permissions: string[],
    tenantId?: string
  ): Promise<Record<string, boolean>> {
    return this.permissionResolver.resolveComplexPermissions(
      userId,
      permissions,
      tenantId
    );
  }

  // Role assignment with smart cache invalidation
  async assignRole(userId: string, roleId: string, tenantId?: string): Promise<void> {
    await this.permissionService.assignRole(userId, roleId, tenantId);
    
    // Smart cache invalidation
    this.cacheInvalidation.invalidate({
      type: 'user',
      id: userId,
      scope: tenantId,
      reason: `Role ${roleId} assigned`,
      timestamp: Date.now()
    });
  }

  // Permission change with cascade invalidation
  async updateRolePermissions(roleId: string, permissions: string[]): Promise<void> {
    await this.permissionService.updateRolePermissions(roleId, permissions);
    
    // Smart cache invalidation with cascade
    this.cacheInvalidation.invalidate({
      type: 'role',
      id: roleId,
      reason: 'Permissions updated',
      timestamp: Date.now()
    });
  }

  // Get performance metrics
  getPerformanceMetrics(): any {
    return {
      resolver: this.permissionResolver.getPerformanceMetrics(),
      cache: {
        pendingInvalidations: this.cacheInvalidation.listenerCount('invalidate')
      }
    };
  }
}
