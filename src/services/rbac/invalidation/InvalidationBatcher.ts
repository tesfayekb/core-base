
// Invalidation Batching Logic
import { InvalidationEvent, InvalidationBatch } from './InvalidationTypes';

export class InvalidationBatcher {
  private pendingInvalidations = new Map<string, InvalidationEvent[]>();
  private batchTimer?: NodeJS.Timeout;
  private readonly BATCH_INTERVAL = 50; // 50ms batching

  addToBatch(event: InvalidationEvent): void {
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
      this.processBatches();
    }, this.BATCH_INTERVAL);
  }

  private async processBatches(): Promise<InvalidationBatch[]> {
    const batches = Array.from(this.pendingInvalidations.entries());
    this.pendingInvalidations.clear();

    return batches.map(([batchKey, events]) => ({
      batchKey,
      events,
      priority: this.calculatePriority(events)
    }));
  }

  private calculatePriority(events: InvalidationEvent[]): number {
    // Higher priority for role changes (affects multiple users)
    const hasRoleChanges = events.some(e => e.type === 'role');
    return hasRoleChanges ? 1 : 0;
  }

  getBatchedInvalidations(): Map<string, InvalidationEvent[]> {
    return new Map(this.pendingInvalidations);
  }
}
