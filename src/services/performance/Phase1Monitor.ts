
// Phase 1.2 Performance Monitoring Utility
// Real-time performance tracking for database foundation

export interface Phase1Metrics {
  database: {
    connectionTime: number;
    queryCount: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  rbac: {
    permissionChecks: number;
    averageCheckTime: number;
    cacheHitRate: number;
  };
  multiTenant: {
    contextSwitches: number;
    averageSwitchTime: number;
    isolationViolations: number;
  };
  audit: {
    eventsLogged: number;
    averageLogTime: number;
    batchOperations: number;
  };
}

export class Phase1Monitor {
  private static instance: Phase1Monitor;
  private metrics: Phase1Metrics;
  private startTime: number;

  constructor() {
    this.metrics = {
      database: {
        connectionTime: 0,
        queryCount: 0,
        averageQueryTime: 0,
        slowQueries: 0
      },
      rbac: {
        permissionChecks: 0,
        averageCheckTime: 0,
        cacheHitRate: 0
      },
      multiTenant: {
        contextSwitches: 0,
        averageSwitchTime: 0,
        isolationViolations: 0
      },
      audit: {
        eventsLogged: 0,
        averageLogTime: 0,
        batchOperations: 0
      }
    };
    this.startTime = performance.now();
  }

  static getInstance(): Phase1Monitor {
    if (!Phase1Monitor.instance) {
      Phase1Monitor.instance = new Phase1Monitor();
    }
    return Phase1Monitor.instance;
  }

  // Database metrics tracking
  recordDatabaseQuery(duration: number): void {
    this.metrics.database.queryCount++;
    this.metrics.database.averageQueryTime = 
      (this.metrics.database.averageQueryTime * (this.metrics.database.queryCount - 1) + duration) / 
      this.metrics.database.queryCount;
    
    if (duration > 50) { // Slow query threshold
      this.metrics.database.slowQueries++;
    }
  }

  recordConnectionTime(duration: number): void {
    this.metrics.database.connectionTime = duration;
  }

  // RBAC metrics tracking
  recordPermissionCheck(duration: number, cacheHit: boolean = false): void {
    this.metrics.rbac.permissionChecks++;
    this.metrics.rbac.averageCheckTime = 
      (this.metrics.rbac.averageCheckTime * (this.metrics.rbac.permissionChecks - 1) + duration) / 
      this.metrics.rbac.permissionChecks;
    
    // Update cache hit rate
    if (cacheHit) {
      this.metrics.rbac.cacheHitRate = 
        (this.metrics.rbac.cacheHitRate * (this.metrics.rbac.permissionChecks - 1) + 100) / 
        this.metrics.rbac.permissionChecks;
    } else {
      this.metrics.rbac.cacheHitRate = 
        (this.metrics.rbac.cacheHitRate * (this.metrics.rbac.permissionChecks - 1) + 0) / 
        this.metrics.rbac.permissionChecks;
    }
  }

  // Multi-tenant metrics tracking
  recordTenantSwitch(duration: number): void {
    this.metrics.multiTenant.contextSwitches++;
    this.metrics.multiTenant.averageSwitchTime = 
      (this.metrics.multiTenant.averageSwitchTime * (this.metrics.multiTenant.contextSwitches - 1) + duration) / 
      this.metrics.multiTenant.contextSwitches;
  }

  recordIsolationViolation(): void {
    this.metrics.multiTenant.isolationViolations++;
  }

  // Audit metrics tracking
  recordAuditEvent(duration: number, isBatch: boolean = false): void {
    this.metrics.audit.eventsLogged++;
    this.metrics.audit.averageLogTime = 
      (this.metrics.audit.averageLogTime * (this.metrics.audit.eventsLogged - 1) + duration) / 
      this.metrics.audit.eventsLogged;
    
    if (isBatch) {
      this.metrics.audit.batchOperations++;
    }
  }

  // Get current metrics
  getMetrics(): Phase1Metrics & { uptime: number } {
    return {
      ...this.metrics,
      uptime: performance.now() - this.startTime
    };
  }

  // Performance health check
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Database health checks
    if (this.metrics.database.connectionTime > 100) {
      issues.push('Database connection time exceeds target (100ms)');
      score -= 15;
    }
    
    if (this.metrics.database.averageQueryTime > 50) {
      issues.push('Average query time exceeds target (50ms)');
      score -= 20;
    }

    if (this.metrics.database.slowQueries > this.metrics.database.queryCount * 0.1) {
      issues.push('Too many slow queries (>10% of total)');
      score -= 15;
    }

    // RBAC health checks
    if (this.metrics.rbac.averageCheckTime > 15) {
      issues.push('Permission checks exceed target (15ms)');
      score -= 20;
    }

    if (this.metrics.rbac.cacheHitRate < 85) {
      issues.push('Permission cache hit rate below target (85%)');
      score -= 10;
    }

    // Multi-tenant health checks
    if (this.metrics.multiTenant.averageSwitchTime > 200) {
      issues.push('Tenant switching exceeds target (200ms)');
      score -= 15;
    }

    if (this.metrics.multiTenant.isolationViolations > 0) {
      issues.push('CRITICAL: Tenant isolation violations detected');
      score -= 30;
    }

    // Audit health checks
    if (this.metrics.audit.averageLogTime > 5) {
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

  // Reset metrics
  reset(): void {
    this.metrics = {
      database: { connectionTime: 0, queryCount: 0, averageQueryTime: 0, slowQueries: 0 },
      rbac: { permissionChecks: 0, averageCheckTime: 0, cacheHitRate: 0 },
      multiTenant: { contextSwitches: 0, averageSwitchTime: 0, isolationViolations: 0 },
      audit: { eventsLogged: 0, averageLogTime: 0, batchOperations: 0 }
    };
    this.startTime = performance.now();
  }

  // Generate performance report
  generateReport(): string {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    return `
📊 Phase 1.2 Performance Report
==============================

🗄️  Database Foundation:
   • Connection Time: ${metrics.database.connectionTime.toFixed(2)}ms
   • Queries Executed: ${metrics.database.queryCount}
   • Average Query Time: ${metrics.database.averageQueryTime.toFixed(2)}ms
   • Slow Queries: ${metrics.database.slowQueries}

🔐 RBAC Foundation:
   • Permission Checks: ${metrics.rbac.permissionChecks}
   • Average Check Time: ${metrics.rbac.averageCheckTime.toFixed(2)}ms
   • Cache Hit Rate: ${metrics.rbac.cacheHitRate.toFixed(1)}%

🏢 Multi-Tenant Foundation:
   • Context Switches: ${metrics.multiTenant.contextSwitches}
   • Average Switch Time: ${metrics.multiTenant.averageSwitchTime.toFixed(2)}ms
   • Isolation Violations: ${metrics.multiTenant.isolationViolations}

📝 Audit Foundation:
   • Events Logged: ${metrics.audit.eventsLogged}
   • Average Log Time: ${metrics.audit.averageLogTime.toFixed(2)}ms
   • Batch Operations: ${metrics.audit.batchOperations}

🎯 Health Status: ${health.status.toUpperCase()} (Score: ${health.score}/100)
   Uptime: ${(metrics.uptime / 1000).toFixed(1)}s

${health.issues.length > 0 ? '\n⚠️  Issues Detected:\n' + health.issues.map(issue => `   • ${issue}`).join('\n') : '✅ No performance issues detected'}
`;
  }
}

// Export singleton instance
export const phase1Monitor = Phase1Monitor.getInstance();
