import { EventEmitter } from 'events';

export interface CacheInvalidationEvent {
  type: 'user' | 'role' | 'permission' | 'entity' | 'global';
  id: string;
  scope?: string;
  reason: string;
  timestamp: number;
}

export class SmartCacheInvalidation extends EventEmitter {
  private pendingInvalidations: Map<string, CacheInvalidationEvent[]> = new Map();
  private batchInterval: number = 100; // 100ms batching
  private batchTimer?: NodeJS.Timeout;

  constructor(private cacheService: any) {
    super();
    this.setupEventHandlers();
  }

  // Smart invalidation with batching and cascade detection
  invalidate(event: CacheInvalidationEvent): void {
    const batchKey = this.getBatchKey(event);
    
    if (!this.pendingInvalidations.has(batchKey)) {
      this.pendingInvalidations.set(batchKey, []);
    }
    
    this.pendingInvalidations.get(batchKey)!.push(event);
    
    // Batch invalidations for performance
    this.scheduleBatchProcess();
  }

  private getBatchKey(event: CacheInvalidationEvent): string {
    return `${event.type}:${event.scope || 'global'}`;
  }

  private scheduleBatchProcess(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatchedInvalidations();
    }, this.batchInterval);
  }

  private async processBatchedInvalidations(): Promise<void> {
    const batches = Array.from(this.pendingInvalidations.entries());
    this.pendingInvalidations.clear();
    
    for (const [batchKey, events] of batches) {
      await this.processInvalidationBatch(batchKey, events);
    }
  }

  private async processInvalidationBatch(
    batchKey: string,
    events: CacheInvalidationEvent[]
  ): Promise<void> {
    const [type] = batchKey.split(':');
    
    switch (type) {
      case 'user':
        await this.invalidateUserCaches(events);
        break;
      case 'role':
        await this.invalidateRoleCaches(events);
        break;
      case 'permission':
        await this.invalidatePermissionCaches(events);
        break;
      case 'entity':
        await this.invalidateEntityCaches(events);
        break;
      case 'global':
        await this.invalidateGlobalCaches(events);
        break;
    }
  }

  private async invalidateUserCaches(events: CacheInvalidationEvent[]): Promise<void> {
    const userIds = [...new Set(events.map(e => e.id))];
    
    // Invalidate user permission caches
    const userKeys = userIds.map(id => `rbac:user:${id}:permissions`);
    await this.cacheService.deleteMany(userKeys);
    
    // Cascade to dependent caches
    for (const userId of userIds) {
      await this.cascadeUserInvalidation(userId);
    }
  }

  private async invalidateRoleCaches(events: CacheInvalidationEvent[]): Promise<void> {
    const roleIds = [...new Set(events.map(e => e.id))];
    
    // Invalidate role permission caches
    const roleKeys = roleIds.map(id => `rbac:role:${id}:permissions`);
    await this.cacheService.deleteMany(roleKeys);
    
    // Find all users with these roles and invalidate their caches
    for (const roleId of roleIds) {
      const usersWithRole = await this.getUsersWithRole(roleId);
      for (const userId of usersWithRole) {
        this.invalidate({
          type: 'user',
          id: userId,
          reason: `Role ${roleId} invalidated`,
          timestamp: Date.now()
        });
      }
    }
  }

  private async cascadeUserInvalidation(userId: string): Promise<void> {
    // Invalidate session-based caches
    const sessionKeys = await this.cacheService.getKeysPattern(`session:*:user:${userId}:*`);
    if (sessionKeys.length > 0) {
      await this.cacheService.deleteMany(sessionKeys);
    }
    
    // Invalidate UI component caches
    const uiKeys = await this.cacheService.getKeysPattern(`ui:permission:${userId}:*`);
    if (uiKeys.length > 0) {
      await this.cacheService.deleteMany(uiKeys);
    }
  }

  private async getUsersWithRole(roleId: string): Promise<string[]> {
    // This would query the database to find users with the specific role
    // Implementation depends on your database structure
    return [];
  }

  private setupEventHandlers(): void {
    // Listen for role assignment events
    this.on('roleAssigned', (userId: string, roleId: string) => {
      this.invalidate({
        type: 'user',
        id: userId,
        reason: `Role ${roleId} assigned`,
        timestamp: Date.now()
      });
    });
    
    // Listen for permission changes
    this.on('permissionChanged', (roleId: string, permission: string) => {
      this.invalidate({
        type: 'role',
        id: roleId,
        reason: `Permission ${permission} changed`,
        timestamp: Date.now()
      });
    });
  }

  private async invalidatePermissionCaches(events: CacheInvalidationEvent[]): Promise<void> {
    // Implementation for invalidating permission-related caches
    // This might involve clearing caches related to specific permissions
    // or updating permission-related data in the cache
  }

  private async invalidateEntityCaches(events: CacheInvalidationEvent[]): Promise<void> {
    // Implementation for invalidating entity-related caches
    // This might involve clearing caches related to specific entities
    // or updating entity-related data in the cache
  }

  private async invalidateGlobalCaches(events: CacheInvalidationEvent[]): Promise<void> {
    // Implementation for invalidating global caches
    // This might involve clearing global caches or updating global data
    // that affects the entire system
  }
}
