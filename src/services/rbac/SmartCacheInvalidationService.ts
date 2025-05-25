
// Smart Cache Invalidation Service - Refactored into smaller modules
import { InvalidationEvent, InvalidationMetrics } from './invalidation/InvalidationTypes';
import { InvalidationProcessor } from './invalidation/InvalidationProcessor';
import { InvalidationBatcher } from './invalidation/InvalidationBatcher';
import { InvalidationMetricsCollector } from './invalidation/InvalidationMetricsCollector';

export class SmartCacheInvalidationService {
  private static instance: SmartCacheInvalidationService;
  private processor: InvalidationProcessor;
  private batcher: InvalidationBatcher;
  private metricsCollector: InvalidationMetricsCollector;

  private constructor() {
    this.processor = new InvalidationProcessor();
    this.batcher = new InvalidationBatcher();
    this.metricsCollector = new InvalidationMetricsCollector();
  }

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

    this.batcher.addToBatch(event);
    this.metricsCollector.addEvent(event);
  }

  async invalidateRole(roleId: string, reason: string): Promise<void> {
    const event: InvalidationEvent = {
      type: 'role',
      entityId: roleId,
      reason,
      timestamp: Date.now(),
      cascadeDepth: 0
    };

    this.batcher.addToBatch(event);
    this.metricsCollector.addEvent(event);
  }

  async invalidateEntity(entityId: string, reason: string): Promise<void> {
    const event: InvalidationEvent = {
      type: 'entity',
      entityId,
      reason,
      timestamp: Date.now(),
      cascadeDepth: 0
    };

    this.batcher.addToBatch(event);
    this.metricsCollector.addEvent(event);
  }

  getInvalidationMetrics(): InvalidationMetrics {
    return this.metricsCollector.getMetrics();
  }

  clearMetrics(): void {
    this.metricsCollector.clearMetrics();
  }
}

export const smartCacheInvalidationService = SmartCacheInvalidationService.getInstance();
export type { InvalidationEvent, InvalidationMetrics };
