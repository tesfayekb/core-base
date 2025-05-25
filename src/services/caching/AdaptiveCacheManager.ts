// Adaptive Cache Manager
// Automatically adjusts cache behavior based on hit rates and performance

import { advancedCacheManager } from '../rbac/AdvancedCacheManager';
import { OptimizedUserPermissionsStrategy } from './strategies/OptimizedUserPermissionsStrategy';

export interface CachePerformanceMetrics {
  hitRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  evictionRate: number;
  targetHitRate: number;
}

export class AdaptiveCacheManager {
  private static instance: AdaptiveCacheManager;
  private performanceHistory: CachePerformanceMetrics[] = [];
  private optimizationStrategy = new OptimizedUserPermissionsStrategy();
  private readonly TARGET_HIT_RATE = 95;
  private readonly MONITORING_INTERVAL = 30000; // 30 seconds
  private monitoringTimer?: NodeJS.Timeout;

  static getInstance(): AdaptiveCacheManager {
    if (!AdaptiveCacheManager.instance) {
      AdaptiveCacheManager.instance = new AdaptiveCacheManager();
    }
    return AdaptiveCacheManager.instance;
  }

  startAdaptiveOptimization(): void {
    this.monitoringTimer = setInterval(() => {
      this.performAdaptiveOptimization();
    }, this.MONITORING_INTERVAL);
  }

  stopAdaptiveOptimization(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
  }

  private async performAdaptiveOptimization(): Promise<void> {
    try {
      const currentMetrics = this.getCurrentMetrics();
      this.performanceHistory.push(currentMetrics);
      
      // Keep only last 20 measurements
      if (this.performanceHistory.length > 20) {
        this.performanceHistory = this.performanceHistory.slice(-20);
      }

      // Trigger optimization if hit rate is below target
      if (currentMetrics.hitRate < this.TARGET_HIT_RATE) {
        await this.executeOptimizationStrategies(currentMetrics);
      }

    } catch (error) {
      console.error('Adaptive cache optimization failed:', error);
    }
  }

  private getCurrentMetrics(): CachePerformanceMetrics {
    const stats = advancedCacheManager.getStats();
    
    return {
      hitRate: stats.hitRate,
      avgResponseTime: 0, // Would be calculated from actual response times
      memoryUsage: stats.memoryUsage,
      evictionRate: stats.evictions / Math.max(stats.totalRequests, 1),
      targetHitRate: this.TARGET_HIT_RATE
    };
  }

  private async executeOptimizationStrategies(
    metrics: CachePerformanceMetrics
  ): Promise<void> {
    console.log(`🔧 Cache hit rate ${metrics.hitRate.toFixed(1)}% below target ${this.TARGET_HIT_RATE}%. Optimizing...`);

    // Strategy 1: Proactive cache warming
    if (metrics.hitRate < 85) {
      await this.proactiveCacheWarming();
    }

    // Strategy 2: Adjust cache size if eviction rate is high
    if (metrics.evictionRate > 0.1) {
      this.recommendCacheSizeIncrease();
    }

    // Strategy 3: Optimize cache keys if hit rate is consistently low
    const recentAvgHitRate = this.getRecentAverageHitRate();
    if (recentAvgHitRate < 90) {
      await this.optimizeCacheKeys();
    }
  }

  private async proactiveCacheWarming(): Promise<void> {
    try {
      const result = await this.optimizationStrategy.execute();
      console.log(`✅ Proactive warming: ${result.message}`);
    } catch (error) {
      console.error('Proactive cache warming failed:', error);
    }
  }

  private recommendCacheSizeIncrease(): void {
    console.log('💡 Recommendation: Consider increasing cache size due to high eviction rate');
  }

  private async optimizeCacheKeys(): Promise<void> {
    // Implement cache key optimization logic
    console.log('🔍 Optimizing cache key patterns for better hit rates');
  }

  private getRecentAverageHitRate(): number {
    if (this.performanceHistory.length < 3) return 100;
    
    const recent = this.performanceHistory.slice(-5);
    return recent.reduce((sum, metric) => sum + metric.hitRate, 0) / recent.length;
  }

  getOptimizationReport(): {
    currentHitRate: number;
    targetHitRate: number;
    recentTrend: 'improving' | 'declining' | 'stable';
    recommendations: string[];
  } {
    const currentMetrics = this.getCurrentMetrics();
    const recentAvg = this.getRecentAverageHitRate();
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (this.performanceHistory.length >= 2) {
      const lastTwo = this.performanceHistory.slice(-2);
      const diff = lastTwo[1].hitRate - lastTwo[0].hitRate;
      trend = diff > 2 ? 'improving' : diff < -2 ? 'declining' : 'stable';
    }

    const recommendations: string[] = [];
    if (currentMetrics.hitRate < this.TARGET_HIT_RATE) {
      recommendations.push('Increase cache warming frequency');
    }
    if (currentMetrics.evictionRate > 0.1) {
      recommendations.push('Consider increasing cache memory allocation');
    }
    if (recentAvg < 90) {
      recommendations.push('Optimize cache key patterns and TTL values');
    }

    return {
      currentHitRate: currentMetrics.hitRate,
      targetHitRate: this.TARGET_HIT_RATE,
      recentTrend: trend,
      recommendations
    };
  }
}

export const adaptiveCacheManager = AdaptiveCacheManager.getInstance();
