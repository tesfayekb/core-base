
// Cache Optimization Utilities
// Advanced edge case handling and optimization strategies

export interface CacheOptimizationConfig {
  maxRetries: number;
  timeoutMs: number;
  batchSize: number;
  concurrencyLimit: number;
  backoffMultiplier: number;
}

export interface CacheHealth {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  memoryUsage: number;
  averageResponseTime: number;
}

export class CacheOptimizationUtils {
  private static defaultConfig: CacheOptimizationConfig = {
    maxRetries: 3,
    timeoutMs: 5000,
    batchSize: 10,
    concurrencyLimit: 5,
    backoffMultiplier: 1.5
  };

  static async executeWithOptimization<T>(
    operation: () => Promise<T>,
    config: Partial<CacheOptimizationConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
      try {
        // Implement timeout protection
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), finalConfig.timeoutMs);
        });

        const result = await Promise.race([operation(), timeoutPromise]);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < finalConfig.maxRetries - 1) {
          // Exponential backoff with jitter
          const backoffTime = Math.pow(finalConfig.backoffMultiplier, attempt) * 100;
          const jitter = Math.random() * 50; // Add jitter to prevent thundering herd
          await new Promise(resolve => setTimeout(resolve, backoffTime + jitter));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  static async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    config: Partial<CacheOptimizationConfig> = {}
  ): Promise<R[]> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const results: R[] = [];
    
    // Process items in batches to prevent memory overload
    for (let i = 0; i < items.length; i += finalConfig.batchSize) {
      const batch = items.slice(i, i + finalConfig.batchSize);
      
      // Limit concurrency within each batch
      const semaphore = this.createSemaphore(finalConfig.concurrencyLimit);
      
      const batchPromises = batch.map(async (item) => {
        await semaphore.acquire();
        try {
          return await this.executeWithOptimization(() => processor(item), config);
        } finally {
          semaphore.release();
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  private static createSemaphore(limit: number) {
    let count = 0;
    const waiting: (() => void)[] = [];

    return {
      async acquire(): Promise<void> {
        if (count < limit) {
          count++;
          return;
        }

        return new Promise<void>((resolve) => {
          waiting.push(resolve);
        });
      },

      release(): void {
        count--;
        const next = waiting.shift();
        if (next) {
          count++;
          next();
        }
      }
    };
  }

  static analyzeCacheHealth(cacheStats: any): CacheHealth {
    const totalRequests = (cacheStats.hits || 0) + (cacheStats.misses || 0);
    
    return {
      hitRate: totalRequests > 0 ? (cacheStats.hits || 0) / totalRequests : 0,
      missRate: totalRequests > 0 ? (cacheStats.misses || 0) / totalRequests : 0,
      evictionRate: (cacheStats.evictions || 0) / Math.max(totalRequests, 1),
      memoryUsage: cacheStats.memoryUsage || 0,
      averageResponseTime: cacheStats.averageResponseTime || 0
    };
  }

  static generateOptimizationRecommendations(health: CacheHealth): string[] {
    const recommendations: string[] = [];

    if (health.hitRate < 0.8) {
      recommendations.push('Consider increasing cache TTL or warming more frequently');
    }

    if (health.evictionRate > 0.1) {
      recommendations.push('Cache size may be too small, consider increasing memory allocation');
    }

    if (health.averageResponseTime > 50) {
      recommendations.push('Cache response time is high, consider optimizing cache backend');
    }

    if (health.memoryUsage > 0.9) {
      recommendations.push('Memory usage is critical, implement aggressive eviction policies');
    }

    return recommendations;
  }

  static createAdaptiveConfig(health: CacheHealth): Partial<CacheOptimizationConfig> {
    const config: Partial<CacheOptimizationConfig> = {};

    // Adapt based on cache health
    if (health.hitRate < 0.7) {
      config.maxRetries = 2; // Reduce retries for poor performing cache
      config.timeoutMs = 3000; // Shorter timeout
    }

    if (health.averageResponseTime > 100) {
      config.batchSize = 5; // Smaller batches for slow cache
      config.concurrencyLimit = 2; // Lower concurrency
    }

    return config;
  }
}
