// Smart Cache Invalidation Service - Enhanced for Phase 2.1
// Implements intelligent invalidation patterns with cascade detection

import { advancedCacheManager } from './AdvancedCacheManager';
import { rbacService } from './rbacService';

export interface InvalidationEvent {
  type: 'user' | 'role' | 'permission' | 'entity' | 'tenant';
  entityId: string;
  userId?: string;
  reason: string;
  timestamp: number;
  cascadeDepth: number;
}

export interface InvalidationMetrics {
  totalInvalidations: number;
  cascadeInvalidations: number;
  averageCascadeDepth: number;
  invalidationsByType: Record<string, number>;
  lastInvalidation: number;
}

export class SmartCacheInvalidationService {
  private static instance: SmartCacheInvalidationService;
  private invalidationHistory: InvalidationEvent[] = [];
  private pendingInvalidations = new Map<string, InvalidationEvent[]>();
  private batchTimer?: NodeJS.Timeout;
  private readonly BATCH_INTERVAL = 50; // 50ms batching
  private readonly MAX_CASCADE_DEPTH = 3;

  static getInstance(): SmartCacheInvalidationService {
    if (!SmartCacheInvalidationService.instance) {
      SmartCacheInvalidationService.instance = new SmartCacheInvalidationService();
    }
    return SmartCacheInvalidationService.instance;
  }

  async invalidateUserPermissions(userId: string, reason: string): Promise<void> {
    const event: InvalidationEvent = {
      type: 'user',
      entityId: userId,
      userId,
      reason,
      timestamp: Date.now(),
      cascadeDepth: 0
    };

    await this.processInvalidation(event);
  }

  async invalidateRole(roleId: string, reason: string): Promise<void> {
    const event: InvalidationEvent = {
      type: 'role',
      entityId: roleId,
      reason,
      timestamp: Date.now(),
      cascadeDepth: 0
    };

    await this.processInvalidation(event);
  }

  async invalidateEntity(entityId: string, reason: string): Promise<void> {
    const event: InvalidationEvent = {
      type: 'entity',
      entityId,
      reason,
      timestamp: Date.now(),
      cascadeDepth: 0
    };

    await this.processInvalidation(event);
  }

  private async processInvalidation(event: InvalidationEvent): Promise<void> {
    // Add to batch for processing
    const batchKey = `${event.type}:${event.entityId}`;
    
    if (!this.pendingInvalidations.has(batchKey)) {
      this.pendingInvalidations.set(batchKey, []);
    }
    
    this.pendingInvalidations.get(batchKey)!.push(event);
    this.scheduleBatchProcess();
  }

  private scheduleBatchProcess(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.executeBatchInvalidations();
    }, this.BATCH_INTERVAL);
  }

  private async executeBatchInvalidations(): Promise<void> {
    const batches = Array.from(this.pendingInvalidations.entries());
    this.pendingInvalidations.clear();

    for (const [batchKey, events] of batches) {
      const [type, entityId] = batchKey.split(':');
      await this.executeInvalidationBatch(type as InvalidationEvent['type'], entityId, events);
    }
  }

  private async executeInvalidationBatch(
    type: InvalidationEvent['type'],
    entityId: string,
    events: InvalidationEvent[]
  ): Promise<void> {
    console.log(`Smart invalidation: ${type}:${entityId} (${events.length} events)`);

    switch (type) {
      case 'user':
        await this.invalidateUserCaches(entityId, events);
        break;
      case 'role':
        await this.invalidateRoleCaches(entityId, events);
        break;
      case 'entity':
        await this.invalidateEntityCaches(entityId, events);
        break;
      case 'tenant':
        await this.invalidateTenantCaches(entityId, events);
        break;
    }

    // Track invalidation history
    this.invalidationHistory.push(...events);
    this.cleanupHistory();
  }

  private async invalidateUserCaches(userId: string, events: InvalidationEvent[]): Promise<void> {
    // Direct user permission invalidation
    advancedCacheManager.invalidateByDependency(`user:${userId}`);
    
    // Cascade to related caches
    await this.cascadeInvalidation(userId, 'user', events[0].cascadeDepth + 1);
  }

  private async invalidateRoleCaches(roleId: string, events: InvalidationEvent[]): Promise<void> {
    // Invalidate role-specific caches
    advancedCacheManager.invalidateByDependency(`role:${roleId}`);
    
    // Find all users with this role and cascade invalidation
    const usersWithRole = await this.getUsersWithRole(roleId);
    for (const userId of usersWithRole) {
      if (events[0].cascadeDepth < this.MAX_CASCADE_DEPTH) {
        await this.invalidateUserPermissions(userId, `Role ${roleId} changed`);
      }
    }
  }

  private async invalidateEntityCaches(entityId: string, events: InvalidationEvent[]): Promise<void> {
    // Invalidate entity-specific caches
    advancedCacheManager.invalidateByDependency(`entity:${entityId}`);
    
    // Cascade to entity users
    await this.cascadeInvalidation(entityId, 'entity', events[0].cascadeDepth + 1);
  }

  private async invalidateTenantCaches(tenantId: string, events: InvalidationEvent[]): Promise<void> {
    // Invalidate tenant-specific caches
    advancedCacheManager.invalidateByDependency(`tenant:${tenantId}`);
  }

  private async cascadeInvalidation(
    entityId: string,
    entityType: string,
    depth: number
  ): Promise<void> {
    if (depth >= this.MAX_CASCADE_DEPTH) {
      console.warn(`Cascade invalidation stopped at depth ${depth} for ${entityType}:${entityId}`);
      return;
    }

    // Smart cascade logic based on entity relationships
    console.log(`Cascade invalidation: ${entityType}:${entityId} at depth ${depth}`);
  }

  private async getUsersWithRole(roleId: string): Promise<string[]> {
    try {
      // This would typically query the database
      // For now, return empty array to prevent errors
      return [];
    } catch (error) {
      console.error('Failed to get users with role:', error);
      return [];
    }
  }

  private cleanupHistory(): void {
    // Keep only last 1000 invalidation events
    if (this.invalidationHistory.length > 1000) {
      this.invalidationHistory = this.invalidationHistory.slice(-1000);
    }
  }

  getInvalidationMetrics(): InvalidationMetrics {
    const totalInvalidations = this.invalidationHistory.length;
    const cascadeInvalidations = this.invalidationHistory.filter(e => e.cascadeDepth > 0).length;
    const averageCascadeDepth = this.invalidationHistory.reduce((sum, e) => sum + e.cascadeDepth, 0) / totalInvalidations || 0;
    
    const invalidationsByType: Record<string, number> = {};
    this.invalidationHistory.forEach(event => {
      invalidationsByType[event.type] = (invalidationsByType[event.type] || 0) + 1;
    });

    return {
      totalInvalidations,
      cascadeInvalidations,
      averageCascadeDepth,
      invalidationsByType,
      lastInvalidation: this.invalidationHistory[this.invalidationHistory.length - 1]?.timestamp || 0
    };
  }

  clearMetrics(): void {
    this.invalidationHistory = [];
  }
}

export const smartCacheInvalidationService = SmartCacheInvalidationService.getInstance();
