
// Cache Level Interface and Types
export interface CacheLevel {
  get(key: string): any;
  set(key: string, value: any, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  getStats(): { size: number; hits: number; misses: number };
}

export interface CacheStats {
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  lastCleanup: number;
}
