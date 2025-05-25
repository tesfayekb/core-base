
// Cache Performance Monitor - Refactored
import { CachePerformanceMetrics, PerformanceAlert } from './monitoring/PerformanceTypes';
import { AlertManager } from './monitoring/AlertManager';
import { MetricsCalculator } from './monitoring/MetricsCalculator';

export class CachePerformanceMonitor {
  private static instance: CachePerformanceMonitor;
  private performanceHistory: Array<{ timestamp: number; metrics: CachePerformanceMetrics }> = [];
  private alertManager = new AlertManager();
  private metricsCalculator = new MetricsCalculator();
  private monitoringInterval?: NodeJS.Timeout;
  
  private readonly TARGET_HIT_RATE = 0.95;
  private readonly TARGET_RESPONSE_TIME = 15;
  private readonly MONITORING_INTERVAL = 30000;

  static getInstance(): CachePerformanceMonitor {
    if (!CachePerformanceMonitor.instance) {
      CachePerformanceMonitor.instance = new CachePerformanceMonitor();
    }
    return CachePerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.MONITORING_INTERVAL);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  getCurrentMetrics(): CachePerformanceMetrics | null {
    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    return latest ? latest.metrics : null;
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alertManager.getActiveAlerts();
  }

  isPerformanceTargetMet(): boolean {
    const metrics = this.getCurrentMetrics();
    return metrics ? metrics.isTargetMet : false;
  }

  generatePerformanceReport(): string {
    const metrics = this.getCurrentMetrics();
    if (!metrics) return 'No metrics available';
    
    return `Performance Report - Hit Rate: ${(metrics.hitRate * 100).toFixed(2)}%, Avg Response: ${metrics.averageResponseTime.toFixed(2)}ms`;
  }

  private async collectMetrics(): Promise<void> {
    try {
      const { advancedCacheManager } = await import('./AdvancedCacheManager');
      const cacheStats = advancedCacheManager.getStats();
      
      const metrics: CachePerformanceMetrics = {
        hitRate: cacheStats.hitRate / 100,
        missRate: (100 - cacheStats.hitRate) / 100,
        totalRequests: cacheStats.totalRequests,
        totalHits: cacheStats.cacheHits,
        totalMisses: cacheStats.cacheMisses,
        averageResponseTime: this.metricsCalculator.calculateAverageResponseTime(),
        peakResponseTime: this.metricsCalculator.calculatePeakResponseTime(),
        cacheSize: cacheStats.totalEntries,
        memoryUsage: cacheStats.memoryUsage / (1024 * 1024),
        evictionRate: this.metricsCalculator.calculateEvictionRate(),
        targetHitRate: this.TARGET_HIT_RATE,
        isTargetMet: (cacheStats.hitRate / 100) >= this.TARGET_HIT_RATE
      };

      this.recordMetrics(metrics);
      this.checkThresholds(metrics);
    } catch (error) {
      console.error('Failed to collect cache metrics:', error);
    }
  }

  private recordMetrics(metrics: CachePerformanceMetrics): void {
    this.performanceHistory.push({
      timestamp: Date.now(),
      metrics
    });

    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
  }

  private checkThresholds(metrics: CachePerformanceMetrics): void {
    if (metrics.hitRate < this.TARGET_HIT_RATE) {
      this.alertManager.addAlert({
        type: 'HIT_RATE_LOW',
        message: `Cache hit rate ${(metrics.hitRate * 100).toFixed(2)}% below target ${(this.TARGET_HIT_RATE * 100)}%`,
        value: metrics.hitRate,
        threshold: this.TARGET_HIT_RATE,
        timestamp: Date.now()
      });
    }

    if (metrics.averageResponseTime > this.TARGET_RESPONSE_TIME) {
      this.alertManager.addAlert({
        type: 'RESPONSE_TIME_HIGH',
        message: `Average response time ${metrics.averageResponseTime.toFixed(2)}ms exceeds target ${this.TARGET_RESPONSE_TIME}ms`,
        value: metrics.averageResponseTime,
        threshold: this.TARGET_RESPONSE_TIME,
        timestamp: Date.now()
      });
    }
  }
}

export const cachePerformanceMonitor = CachePerformanceMonitor.getInstance();
