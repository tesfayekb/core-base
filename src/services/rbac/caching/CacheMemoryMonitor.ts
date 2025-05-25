// Cache Memory Monitor - Centralized memory management
export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

export interface CacheMemoryStats {
  totalCacheSize: number;
  memoryUsageBytes: number;
  memoryUsagePercentage: number;
  cacheEfficiency: number;
  recommendedAction?: 'none' | 'cleanup' | 'compress' | 'evict';
}

export class CacheMemoryMonitor {
  private static instance: CacheMemoryMonitor;
  private memoryHistory: MemoryMetrics[] = [];
  private readonly MAX_HISTORY = 100;
  private readonly MEMORY_WARNING_THRESHOLD = 0.8; // 80%
  private readonly MEMORY_CRITICAL_THRESHOLD = 0.9; // 90%
  
  static getInstance(): CacheMemoryMonitor {
    if (!CacheMemoryMonitor.instance) {
      CacheMemoryMonitor.instance = new CacheMemoryMonitor();
    }
    return CacheMemoryMonitor.instance;
  }

  getCurrentMemoryUsage(): MemoryMetrics {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      return {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        timestamp: Date.now()
      };
    }
    
    // Fallback for browser environment
    return {
      heapUsed: 0,
      heapTotal: 100 * 1024 * 1024, // 100MB default
      external: 0,
      rss: 0,
      timestamp: Date.now()
    };
  }

  recordMemoryUsage(): void {
    const metrics = this.getCurrentMemoryUsage();
    this.memoryHistory.push(metrics);
    
    // Keep only last MAX_HISTORY entries
    if (this.memoryHistory.length > this.MAX_HISTORY) {
      this.memoryHistory = this.memoryHistory.slice(-this.MAX_HISTORY);
    }
  }

  getCacheMemoryStats(cacheSize: number, estimatedItemSize: number = 1024): CacheMemoryStats {
    const currentMemory = this.getCurrentMemoryUsage();
    const totalCacheMemory = cacheSize * estimatedItemSize;
    const memoryUsagePercentage = currentMemory.heapUsed / currentMemory.heapTotal;
    
    let recommendedAction: 'none' | 'cleanup' | 'compress' | 'evict' = 'none';
    
    if (memoryUsagePercentage > this.MEMORY_CRITICAL_THRESHOLD) {
      recommendedAction = 'evict';
    } else if (memoryUsagePercentage > this.MEMORY_WARNING_THRESHOLD) {
      recommendedAction = 'cleanup';
    } else if (totalCacheMemory > currentMemory.heapTotal * 0.3) {
      recommendedAction = 'compress';
    }

    return {
      totalCacheSize: cacheSize,
      memoryUsageBytes: totalCacheMemory,
      memoryUsagePercentage,
      cacheEfficiency: this.calculateCacheEfficiency(),
      recommendedAction
    };
  }

  private calculateCacheEfficiency(): number {
    // Simple efficiency calculation based on memory growth rate
    if (this.memoryHistory.length < 2) return 1.0;
    
    const recent = this.memoryHistory.slice(-10);
    const growthRate = recent.length > 1 
      ? (recent[recent.length - 1].heapUsed - recent[0].heapUsed) / recent.length
      : 0;
    
    // Efficiency decreases as growth rate increases
    return Math.max(0.1, 1.0 - (growthRate / (10 * 1024 * 1024))); // Normalize by 10MB
  }

  isMemoryPressure(): boolean {
    const current = this.getCurrentMemoryUsage();
    return (current.heapUsed / current.heapTotal) > this.MEMORY_WARNING_THRESHOLD;
  }

  getMemoryRecommendations(): string[] {
    const recommendations: string[] = [];
    const current = this.getCurrentMemoryUsage();
    const usagePercentage = current.heapUsed / current.heapTotal;
    
    if (usagePercentage > this.MEMORY_CRITICAL_THRESHOLD) {
      recommendations.push('CRITICAL: Memory usage above 90% - immediate cache eviction needed');
    } else if (usagePercentage > this.MEMORY_WARNING_THRESHOLD) {
      recommendations.push('WARNING: Memory usage above 80% - consider cache cleanup');
    }
    
    if (this.memoryHistory.length >= 10) {
      const recent = this.memoryHistory.slice(-10);
      const avgGrowth = recent.reduce((acc, m, i) => {
        if (i === 0) return acc;
        return acc + (m.heapUsed - recent[i-1].heapUsed);
      }, 0) / (recent.length - 1);
      
      if (avgGrowth > 1024 * 1024) { // 1MB per measurement
        recommendations.push('Memory growth detected - implement cache size limits');
      }
    }
    
    return recommendations;
  }
}

export const cacheMemoryMonitor = CacheMemoryMonitor.getInstance();
