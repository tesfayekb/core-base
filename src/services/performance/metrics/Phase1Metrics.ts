
// Phase 1 Performance Metrics Types and Utilities
// Extracted from Phase1Monitor.ts for better organization

export interface Phase1Metrics {
  database: DatabaseMetrics;
  rbac: RBACMetrics;
  multiTenant: MultiTenantMetrics;
  audit: AuditMetrics;
}

export interface DatabaseMetrics {
  connectionTime: number;
  queryCount: number;
  averageQueryTime: number;
  slowQueries: number;
}

export interface RBACMetrics {
  permissionChecks: number;
  averageCheckTime: number;
  cacheHitRate: number;
}

export interface MultiTenantMetrics {
  contextSwitches: number;
  averageSwitchTime: number;
  isolationViolations: number;
}

export interface AuditMetrics {
  eventsLogged: number;
  averageLogTime: number;
  batchOperations: number;
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  score: number;
}

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
    if (metrics.rbac.averageCheckTime > 15) {
      issues.push('Permission checks exceed target (15ms)');
      score -= 20;
    }

    if (metrics.rbac.cacheHitRate < 85) {
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
}
