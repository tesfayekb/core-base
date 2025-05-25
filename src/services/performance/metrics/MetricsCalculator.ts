
// Metrics Calculator utility functions
// Provides calculation methods for performance metrics

import { Phase1Metrics, HealthStatus } from './Phase1Metrics';

export class MetricsCalculator {
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
}
