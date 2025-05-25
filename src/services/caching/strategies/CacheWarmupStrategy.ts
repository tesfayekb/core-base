
// Cache warmup strategy interface and base implementation
// Extracted from CacheWarmingService.ts for better organization

export interface CacheWarmupResult {
  strategyName: string;
  success: boolean;
  message: string;
  duration: number;
  itemsWarmed: number;
}

export interface CacheWarmupStrategy {
  name: string;
  description: string;
  execute: () => Promise<CacheWarmupResult>;
}

export abstract class BaseCacheWarmupStrategy implements CacheWarmupStrategy {
  abstract name: string;
  abstract description: string;

  protected async simulateCacheSet(key: string, value: string): Promise<void> {
    // Simulate setting a value in the cache with a small delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    console.log(`[Cache Warming] Set key "${key}" to value "${value}"`);
  }

  protected async executeWithTiming<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  abstract execute(): Promise<CacheWarmupResult>;
}
