
import { PerformanceMeasurement } from './PerformanceMeasurement';
import { MetricsCalculator } from './metrics/MetricsCalculator';
import { DetailedPerformanceMetrics } from './metrics/MetricsTypes';

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
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    console.log('📊 Detailed performance metrics collection started');
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
    return metrics;
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
}

export const detailedMetricsCollector = DetailedMetricsCollector.getInstance();
export type { DetailedPerformanceMetrics } from './metrics/MetricsTypes';
