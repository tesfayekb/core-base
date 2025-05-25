
// Invalidation Metrics Collection
import { InvalidationEvent, InvalidationMetrics } from './InvalidationTypes';

export class InvalidationMetricsCollector {
  private invalidationHistory: InvalidationEvent[] = [];
  private readonly MAX_HISTORY_SIZE = 1000;

  addEvent(event: InvalidationEvent): void {
    this.invalidationHistory.push(event);
    this.cleanupHistory();
  }

  addEvents(events: InvalidationEvent[]): void {
    this.invalidationHistory.push(...events);
    this.cleanupHistory();
  }

  getMetrics(): InvalidationMetrics {
    const totalInvalidations = this.invalidationHistory.length;
    const cascadeInvalidations = this.invalidationHistory.filter(e => e.cascadeDepth > 0).length;
    const averageCascadeDepth = totalInvalidations > 0 
      ? this.invalidationHistory.reduce((sum, e) => sum + e.cascadeDepth, 0) / totalInvalidations 
      : 0;
    
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

  private cleanupHistory(): void {
    if (this.invalidationHistory.length > this.MAX_HISTORY_SIZE) {
      this.invalidationHistory = this.invalidationHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }
}
