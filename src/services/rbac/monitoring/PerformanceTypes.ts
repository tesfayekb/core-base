
// Performance Monitoring Types
export interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  averageResponseTime: number;
  peakResponseTime: number;
  cacheSize: number;
  memoryUsage: number;
  evictionRate: number;
  targetHitRate: number;
  isTargetMet: boolean;
}

export interface PerformanceAlert {
  type: 'HIT_RATE_LOW' | 'RESPONSE_TIME_HIGH' | 'MEMORY_HIGH' | 'EVICTION_HIGH';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}
