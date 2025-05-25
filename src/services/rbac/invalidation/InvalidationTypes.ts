
// Invalidation Types and Interfaces
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

export interface InvalidationBatch {
  batchKey: string;
  events: InvalidationEvent[];
  priority: number;
}
