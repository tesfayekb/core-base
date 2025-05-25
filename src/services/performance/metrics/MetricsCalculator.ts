// Metrics Calculator utility functions
// Provides calculation methods for performance metrics

import { Phase1Metrics, HealthStatus } from './Phase1Metrics';
import { DetailedPerformanceMetrics } from './MetricsTypes';

export class MetricsCalculator {
  private metricsHistory: DetailedPerformanceMetrics[] = [];

  static calculateAverageQueryTime(currentAvg: number, newDuration: number, queryCount: number): number {
    return (currentAvg * (queryCount - 1) + newDuration) / queryCount;
  }

  static calculateCacheHitRate(currentRate: number, isHit: boolean, totalChecks: number): number {
    const hitValue = isHit ? 100 : 0;
    return (currentRate * (totalChecks - 1) + hitValue) / totalChecks;
  }

  static calculateAverageTime(currentAvg: number, newDuration: number, operationCount: number): number {
    return (currentAvg * (operationCount - 1) + newDuration) / operationCount;
  }

  static assessHealthStatus(metrics: Phase1Metrics): HealthStatus {
    const issues: string[] = [];
    let score = 100;

    // Database health checks
    if (metrics.database.connectionTime > 100) {
      issues.push('Database connection time exceeds target (100ms)');
      score -= 15;
    }
    
    if (metrics.database.averageQueryTime > 50) {
      issues.push('Average query time exceeds target (50ms)');
      score -= 20;
    }

    if (metrics.database.slowQueries > metrics.database.queryCount * 0.1) {
      issues.push('Too many slow queries (>10% of total)');
      score -= 15;
    }

    // RBAC health checks
    if (metrics.permissions.averageCheckTime > 15) {
      issues.push('Permission checks exceed target (15ms)');
      score -= 20;
    }

    if (metrics.permissions.cacheHitRate < 85) {
      issues.push('Permission cache hit rate below target (85%)');
      score -= 10;
    }

    // Multi-tenant health checks
    if (metrics.multiTenant.averageSwitchTime > 200) {
      issues.push('Tenant switching exceeds target (200ms)');
      score -= 15;
    }

    if (metrics.multiTenant.isolationViolations > 0) {
      issues.push('CRITICAL: Tenant isolation violations detected');
      score -= 30;
    }

    // Audit health checks
    if (metrics.audit.averageLogTime > 5) {
      issues.push('Audit logging exceeds target (5ms)');
      score -= 10;
    }

    // Cache health checks
    if (metrics.cache.warmupStatus === 'error') {
      issues.push('Cache warming system has errors');
      score -= 15;
    }

    if (metrics.cache.hitRate < 85) {
      issues.push('Cache hit rate below target (85%)');
      score -= 10;
    }

    // Dependency resolution health checks
    if (metrics.dependencies.averageResolutionTime > 25) {
      issues.push('Dependency resolution exceeds target (25ms)');
      score -= 10;
    }

    // Alert health checks
    if (metrics.alerts.activeAlerts > 5) {
      issues.push('Too many active alerts indicating system stress');
      score -= 20;
    }

    // Determine status
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 85) {
      status = 'healthy';
    } else if (score >= 70) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return { status, issues, score };
  }

  static calculateSystemScore(metrics: Phase1Metrics): number {
    const health = this.assessHealthStatus(metrics);
    return health.score;
  }

  static generatePerformanceReport(metrics: Phase1Metrics): {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    recommendations: string[];
  } {
    const health = this.assessHealthStatus(metrics);
    const recommendations: string[] = [];

    // Generate performance recommendations based on metrics
    if (metrics.database.averageQueryTime > 50) {
      recommendations.push('Consider optimizing database queries and adding indexes');
    }

    if (metrics.permissions.cacheHitRate < 85) {
      recommendations.push('Improve permission caching strategy');
    }

    if (metrics.multiTenant.averageSwitchTime > 200) {
      recommendations.push('Optimize tenant context switching logic');
    }

    if (metrics.cache.hitRate < 85) {
      recommendations.push('Review and optimize caching strategy');
    }

    if (metrics.dependencies.averageResolutionTime > 25) {
      recommendations.push('Optimize dependency resolution algorithm');
    }

    return {
      score: health.score,
      status: health.status,
      recommendations
    };
  }

  // New methods for DetailedMetricsCollector
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
