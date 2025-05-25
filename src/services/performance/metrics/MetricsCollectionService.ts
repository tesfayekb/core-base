// Metrics collection service
// Extracted from MetricsCalculator.ts for better organization

import { DetailedPerformanceMetrics } from './MetricsTypes';

export class MetricsCollectionService {
  private metricsHistory: DetailedPerformanceMetrics[] = [];

  async collectSystemMetrics(): Promise<any> {
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      timestamp: Date.now()
    };
  }

  async collectDatabaseMetrics(): Promise<any> {
    return {
      averageQueryTime: 25 + Math.random() * 50,
      activeConnections: Math.floor(Math.random() * 100),
      cacheHitRate: 85 + Math.random() * 15,
      timestamp: Date.now()
    };
  }

  async collectSecurityMetrics(): Promise<any> {
    return {
      permissionCheckLatency: 10 + Math.random() * 10,
      authenticationLatency: 100 + Math.random() * 100,
      securityViolations: Math.floor(Math.random() * 5),
      timestamp: Date.now()
    };
  }

  async collectUserExperienceMetrics(): Promise<any> {
    return {
      pageLoadTime: 1000 + Math.random() * 2000,
      interactionLatency: 50 + Math.random() * 100,
      errorRate: Math.random() * 5,
      timestamp: Date.now()
    };
  }

  async collectNetworkMetrics(): Promise<any> {
    return {
      latency: 50 + Math.random() * 200,
      bandwidth: 100 + Math.random() * 900,
      connectionQuality: Math.random() > 0.8 ? 'poor' : Math.random() > 0.5 ? 'good' : 'excellent',
      timestamp: Date.now()
    };
  }

  async collectMemoryMetrics(): Promise<any> {
    return {
      heapUsed: Math.random() * 1000000000,
      heapTotal: 1000000000 + Math.random() * 500000000,
      external: Math.random() * 100000000,
      timestamp: Date.now()
    };
  }

  updateHistory(metrics: DetailedPerformanceMetrics): void {
    this.metricsHistory.push(metrics);
    // Keep only last 100 entries
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }
  }

  getHistory(): DetailedPerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  getLatest(): DetailedPerformanceMetrics | null {
    return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  getTrends(): Record<string, number[]> {
    const trends: Record<string, number[]> = {};
    
    this.metricsHistory.forEach(metric => {
      if (!trends.cpuUsage) trends.cpuUsage = [];
      if (!trends.memoryUsage) trends.memoryUsage = [];
      if (!trends.networkLatency) trends.networkLatency = [];
      
      trends.cpuUsage.push(metric.system?.cpuUsage || 0);
      trends.memoryUsage.push(metric.system?.memoryUsage || 0);
      trends.networkLatency.push(metric.network?.latency || 0);
    });
    
    return trends;
  }
}
