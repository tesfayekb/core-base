
// Optimized Cache Invalidation Service
// Implements smart batching and minimal invalidation patterns

import { advancedCacheManager } from '../rbac/AdvancedCacheManager';

export interface OptimizedInvalidationEvent {
  type: 'user' | 'role' | 'permission' | 'tenant';
  entityId: string;
  scope?: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

export class OptimizedCacheInvalidation {
  private static instance: OptimizedCacheInvalidation;
  private pendingInvalidations = new Map<string, OptimizedInvalidationEvent[]>();
  private batchTimer?: NodeJS.Timeout;
  private readonly BATCH_INTERVALS = {
    high: 10,    // 10ms for high priority
    medium: 50,  // 50ms for medium priority
    low: 200     // 200ms for low priority
  };

  static getInstance(): OptimizedCacheInvalidation {
    if (!OptimizedCacheInvalidation.instance) {
      OptimizedCacheInvalidation.instance = new OptimizedCacheInvalidation();
    }
    return OptimizedCacheInvalidation.instance;
  }

  invalidate(event: OptimizedInvalidationEvent): void {
    const batchKey = `${event.priority}:${event.type}:${event.entityId}`;
    
    if (!this.pendingInvalidations.has(batchKey)) {
      this.pendingInvalidations.set(batchKey, []);
    }
    
    this.pendingInvalidations.get(batchKey)!.push(event);
    this.scheduleBatchProcess(event.priority);
  }

  private scheduleBatchProcess(priority: 'low' | 'medium' | 'high'): void {
    if (this.batchTimer) {
      // If we have a high priority event, process immediately
      if (priority === 'high') {
        clearTimeout(this.batchTimer);
        this.processBatchedInvalidations();
        return;
      }
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatchedInvalidations();
    }, this.BATCH_INTERVALS[priority]);
  }

  private async processBatchedInvalidations(): Promise<void> {
    const batches = Array.from(this.pendingInvalidations.entries());
    this.pendingInvalidations.clear();

    // Group by priority for efficient processing
    const priorityGroups = {
      high: batches.filter(([key]) => key.startsWith('high:')),
      medium: batches.filter(([key]) => key.startsWith('medium:')),
      low: batches.filter(([key]) => key.startsWith('low:'))
    };

    // Process high priority first
    for (const group of [priorityGroups.high, priorityGroups.medium, priorityGroups.low]) {
      await Promise.all(group.map(([batchKey, events]) => 
        this.processInvalidationBatch(batchKey, events)
      ));
    }
  }

  private async processInvalidationBatch(
    batchKey: string,
    events: OptimizedInvalidationEvent[]
  ): Promise<void> {
    const [priority, type, entityId] = batchKey.split(':');
    
    // Use smart invalidation patterns to minimize cache clearing
    switch (type) {
      case 'user':
        await this.invalidateUserCacheOptimized(entityId, events);
        break;
      case 'role':
        await this.invalidateRoleCacheOptimized(entityId, events);
        break;
      case 'permission':
        await this.invalidatePermissionCacheOptimized(entityId, events);
        break;
      case 'tenant':
        await this.invalidateTenantCacheOptimized(entityId, events);
        break;
    }
  }

  private async invalidateUserCacheOptimized(
    userId: string,
    events: OptimizedInvalidationEvent[]
  ): Promise<void> {
    // Only invalidate specific user permissions, not all cache
    advancedCacheManager.invalidateByDependency(`user:${userId}`);
    
    // Don't cascade unless explicitly needed
    const needsCascade = events.some(e => e.reason.includes('role_change'));
    if (needsCascade) {
      advancedCacheManager.invalidateByDependency(`session:${userId}`);
    }
  }

  private async invalidateRoleCacheOptimized(
    roleId: string,
    events: OptimizedInvalidationEvent[]
  ): Promise<void> {
    // Invalidate role-specific cache only
    advancedCacheManager.invalidateByDependency(`role:${roleId}`);
    
    // Only cascade to users if permissions actually changed
    const permissionChanged = events.some(e => e.reason.includes('permission'));
    if (permissionChanged) {
      // This would normally query for users with this role
      // For now, we'll use a targeted approach
      advancedCacheManager.invalidateByDependency(`role_users:${roleId}`);
    }
  }

  private async invalidatePermissionCacheOptimized(
    permissionId: string,
    events: OptimizedInvalidationEvent[]
  ): Promise<void> {
    // Invalidate only permission-specific entries
    advancedCacheManager.invalidateByDependency(`permission:${permissionId}`);
  }

  private async invalidateTenantCacheOptimized(
    tenantId: string,
    events: OptimizedInvalidationEvent[]
  ): Promise<void> {
    // Invalidate tenant-specific cache only
    advancedCacheManager.invalidateByDependency(`tenant:${tenantId}`);
  }

  // Helper methods for common invalidation patterns
  invalidateUserPermissions(userId: string, reason: string = 'user_update'): void {
    this.invalidate({
      type: 'user',
      entityId: userId,
      reason,
      priority: 'medium',
      timestamp: Date.now()
    });
  }

  invalidateRolePermissions(roleId: string, reason: string = 'role_update'): void {
    this.invalidate({
      type: 'role',
      entityId: roleId,
      reason,
      priority: 'high', // Role changes affect multiple users
      timestamp: Date.now()
    });
  }

  getInvalidationStats(): {
    pendingInvalidations: number;
    lastProcessed: number;
  } {
    return {
      pendingInvalidations: Array.from(this.pendingInvalidations.values())
        .reduce((total, events) => total + events.length, 0),
      lastProcessed: Date.now()
    };
  }
}

export const optimizedCacheInvalidation = OptimizedCacheInvalidation.getInstance();
