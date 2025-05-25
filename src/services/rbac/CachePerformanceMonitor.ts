// Cache Performance Monitor - Phase 2.1 Cache Hit Rate Validation
// Monitors cache performance and ensures >95% hit rate target

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

export class CachePerformanceMonitor {
  private static instance: CachePerformanceMonitor;
  private performanceHistory: Array<{ timestamp: number; metrics: CachePerformanceMetrics }> = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  
  // Performance targets for Phase 2.1
  private readonly TARGET_HIT_RATE = 0.95; // 95%
  private readonly TARGET_RESPONSE_TIME = 15; // 15ms
  private readonly TARGET_MEMORY_USAGE = 0.8; // 80%
  private readonly MONITORING_INTERVAL = 30000; // 30 seconds

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

    console.log('Cache performance monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log('Cache performance monitoring stopped');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const { advancedCacheManager } = await import('./AdvancedCacheManager');
      const cacheStats = advancedCacheManager.getStats();
      
      const metrics: CachePerformanceMetrics = {
        hitRate: cacheStats.hitRate / 100, // Convert percentage to decimal
        missRate: (100 - cacheStats.hitRate) / 100,
        totalRequests: cacheStats.totalRequests,
        totalHits: cacheStats.cacheHits,
        totalMisses: cacheStats.cacheMisses,
        averageResponseTime: this.calculateAverageResponseTime(),
        peakResponseTime: this.calculatePeakResponseTime(),
        cacheSize: cacheStats.totalEntries,
        memoryUsage: cacheStats.memoryUsage / (1024 * 1024), // Convert to MB
        evictionRate: this.calculateEvictionRate(),
        targetHitRate: this.TARGET_HIT_RATE,
        isTargetMet: (cacheStats.hitRate / 100) >= this.TARGET_HIT_RATE
      };

      this.recordMetrics(metrics);
      this.checkPerformanceThresholds(metrics);

    } catch (error) {
      console.error('Failed to collect cache metrics:', error);
    }
  }

  private recordMetrics(metrics: CachePerformanceMetrics): void {
    this.performanceHistory.push({
      timestamp: Date.now(),
      metrics
    });

    // Keep only last 1000 entries (about 8 hours at 30-second intervals)
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
  }

  private checkPerformanceThresholds(metrics: CachePerformanceMetrics): void {
    // Check hit rate threshold
    if (metrics.hitRate < this.TARGET_HIT_RATE) {
      this.addAlert({
        type: 'HIT_RATE_LOW',
        message: `Cache hit rate ${(metrics.hitRate * 100).toFixed(2)}% below target ${(this.TARGET_HIT_RATE * 100)}%`,
        value: metrics.hitRate,
        threshold: this.TARGET_HIT_RATE,
        timestamp: Date.now()
      });
    }

    // Check response time threshold
    if (metrics.averageResponseTime > this.TARGET_RESPONSE_TIME) {
      this.addAlert({
        type: 'RESPONSE_TIME_HIGH',
        message: `Average response time ${metrics.averageResponseTime.toFixed(2)}ms exceeds target ${this.TARGET_RESPONSE_TIME}ms`,
        value: metrics.averageResponseTime,
        threshold: this.TARGET_RESPONSE_TIME,
        timestamp: Date.now()
      });
    }

    // Check memory usage threshold
    if (metrics.memoryUsage / (metrics.cacheSize * 1024) > this.TARGET_MEMORY_USAGE) {
      this.addAlert({
        type: 'MEMORY_HIGH',
        message: `Memory usage is high: ${metrics.memoryUsage.toFixed(2)}MB`,
        value: metrics.memoryUsage,
        threshold: this.TARGET_MEMORY_USAGE,
        timestamp: Date.now()
      });
    }
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    console.warn(`Cache Performance Alert: ${alert.message}`);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private calculateAverageResponseTime(): number {
    // Simulated calculation - in real implementation, would track actual response times
    return Math.random() * 20; // 0-20ms
  }

  private calculatePeakResponseTime(): number {
    // Simulated calculation
    return Math.random() * 50; // 0-50ms
  }

  private calculateEvictionRate(): number {
    // Simulated calculation
    return Math.random() * 0.1; // 0-10%
  }

  getCurrentMetrics(): CachePerformanceMetrics | null {
    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    return latest ? latest.metrics : null;
  }

  getPerformanceHistory(hours: number = 1): Array<{ timestamp: number; metrics: CachePerformanceMetrics }> {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.performanceHistory.filter(entry => entry.timestamp >= cutoffTime);
  }

  getActiveAlerts(): PerformanceAlert[] {
    const cutoffTime = Date.now() - (60 * 60 * 1000); // Last hour
    return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  isPerformanceTargetMet(): boolean {
    const currentMetrics = this.getCurrentMetrics();
    return currentMetrics ? currentMetrics.isTargetMet : false;
  }

  generatePerformanceReport(): {
    summary: string;
    hitRateStatus: string;
    recommendations: string[];
  } {
    const metrics = this.getCurrentMetrics();
    if (!metrics) {
      return {
        summary: 'No performance data available',
        hitRateStatus: 'Unknown',
        recommendations: ['Start cache monitoring']
      };
    }

    const hitRatePercentage = (metrics.hitRate * 100).toFixed(2);
    const targetPercentage = (this.TARGET_HIT_RATE * 100).toFixed(0);
    
    const summary = `Cache hit rate: ${hitRatePercentage}% (Target: ${targetPercentage}%)`;
    const hitRateStatus = metrics.isTargetMet ? 'MEETING TARGET' : 'BELOW TARGET';
    
    const recommendations: string[] = [];
    if (!metrics.isTargetMet) {
      recommendations.push('Increase cache warming frequency');
      recommendations.push('Review cache TTL settings');
      recommendations.push('Optimize cache key strategies');
    }
    
    if (metrics.averageResponseTime > this.TARGET_RESPONSE_TIME) {
      recommendations.push('Optimize cache lookup performance');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal');
    }

    return { summary, hitRateStatus, recommendations };
  }
}

export const cachePerformanceMonitor = CachePerformanceMonitor.getInstance();
