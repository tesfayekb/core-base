
import { PerformanceMeasurement } from './PerformanceMeasurement';
import { MetricsCalculator } from './metrics/MetricsCalculator';
import { DetailedPerformanceMetrics } from './metrics/MetricsTypes';
import { realDataCollector } from './RealDataCollector';

export class DetailedMetricsCollector {
  private static instance: DetailedMetricsCollector;
  private performanceMeasurement: PerformanceMeasurement;
  private metricsCalculator: MetricsCalculator;

  static getInstance(): DetailedMetricsCollector {
    if (!DetailedMetricsCollector.instance) {
      DetailedMetricsCollector.instance = new DetailedMetricsCollector();
    }
    return DetailedMetricsCollector.instance;
  }

  private constructor() {
    this.performanceMeasurement = PerformanceMeasurement.getInstance();
    this.metricsCalculator = new MetricsCalculator();
    this.startDetailedCollection();
  }

  private startDetailedCollection(): void {
    // Collect initial metrics immediately
    this.collectMetrics();

    // Then collect every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    console.log('📊 Real-time performance metrics collection started');
  }

  async collectMetrics(): Promise<DetailedPerformanceMetrics> {
    const metrics: DetailedPerformanceMetrics = {
      system: await this.metricsCalculator.collectSystemMetrics(),
      database: await this.metricsCalculator.collectDatabaseMetrics(),
      security: await this.metricsCalculator.collectSecurityMetrics(),
      user: await this.metricsCalculator.collectUserExperienceMetrics(),
      network: await this.metricsCalculator.collectNetworkMetrics(),
      memory: await this.metricsCalculator.collectMemoryMetrics()
    };

    this.metricsCalculator.updateHistory(metrics);
    
    // Log significant performance issues
    this.logPerformanceIssues(metrics);
    
    return metrics;
  }

  private logPerformanceIssues(metrics: DetailedPerformanceMetrics): void {
    const issues: string[] = [];

    if (metrics.database.averageQueryTime > 50) {
      issues.push(`Slow database queries: ${metrics.database.averageQueryTime.toFixed(2)}ms avg`);
    }

    if (metrics.system.memoryUsage > 80) {
      issues.push(`High memory usage: ${metrics.system.memoryUsage.toFixed(1)}%`);
    }

    if (metrics.user.pageLoadTime > 2000) {
      issues.push(`Slow page load: ${(metrics.user.pageLoadTime / 1000).toFixed(2)}s`);
    }

    if (metrics.network.connectionQuality === 'poor') {
      issues.push('Poor network connection detected');
    }

    if (issues.length > 0) {
      console.warn('⚠️ Performance issues detected:', issues);
    }
  }

  getMetricsHistory(): DetailedPerformanceMetrics[] {
    return this.metricsCalculator.getHistory();
  }

  getLatestMetrics(): DetailedPerformanceMetrics | null {
    return this.metricsCalculator.getLatest();
  }

  getPerformanceTrends(): Record<string, number[]> {
    return this.metricsCalculator.getTrends();
  }

  getPerformanceInsights(): string[] {
    const latest = this.getLatestMetrics();
    if (!latest) return ['No performance data available'];

    const insights: string[] = [];

    // Database insights
    if (latest.database.cacheHitRate < 85) {
      insights.push('Consider optimizing database caching strategy');
    }

    // Memory insights  
    if (latest.memory.heapUsed / latest.memory.heapTotal > 0.8) {
      insights.push('Memory usage is high, consider memory optimization');
    }

    // Network insights
    if (latest.network.latency > 200) {
      insights.push('High network latency detected, consider CDN optimization');
    }

    // Security insights
    if (latest.security.permissionCheckLatency > 15) {
      insights.push('Permission checks are slow, optimize RBAC caching');
    }

    return insights.length > 0 ? insights : ['System performance is optimal'];
  }
}

export const detailedMetricsCollector = DetailedMetricsCollector.getInstance();
export type { DetailedPerformanceMetrics } from './metrics/MetricsTypes';
