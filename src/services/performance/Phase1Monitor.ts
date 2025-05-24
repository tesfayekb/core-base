
// Phase 1.2 Performance Monitoring Utility - Refactored
// Version: 2.0.0
// Real-time performance tracking for database foundation

import { 
  Phase1Metrics, 
  HealthStatus, 
  MetricsCalculator 
} from './metrics/Phase1Metrics';

export class Phase1Monitor {
  private static instance: Phase1Monitor;
  private metrics: Phase1Metrics;
  private startTime: number;

  constructor() {
    this.resetMetrics();
  }

  static getInstance(): Phase1Monitor {
    if (!Phase1Monitor.instance) {
      Phase1Monitor.instance = new Phase1Monitor();
    }
    return Phase1Monitor.instance;
  }

  recordDatabaseQuery(duration: number): void {
    this.metrics.database.queryCount++;
    this.metrics.database.averageQueryTime = MetricsCalculator.calculateAverageQueryTime(
      this.metrics.database.averageQueryTime,
      duration,
      this.metrics.database.queryCount
    );
    
    if (duration > 50) { // Slow query threshold
      this.metrics.database.slowQueries++;
    }
  }

  recordConnectionTime(duration: number): void {
    this.metrics.database.connectionTime = duration;
  }

  recordPermissionCheck(duration: number, cacheHit: boolean = false): void {
    this.metrics.rbac.permissionChecks++;
    this.metrics.rbac.averageCheckTime = MetricsCalculator.calculateAverageTime(
      this.metrics.rbac.averageCheckTime,
      duration,
      this.metrics.rbac.permissionChecks
    );
    
    this.metrics.rbac.cacheHitRate = MetricsCalculator.calculateCacheHitRate(
      this.metrics.rbac.cacheHitRate,
      cacheHit,
      this.metrics.rbac.permissionChecks
    );
  }

  recordTenantSwitch(duration: number): void {
    this.metrics.multiTenant.contextSwitches++;
    this.metrics.multiTenant.averageSwitchTime = MetricsCalculator.calculateAverageTime(
      this.metrics.multiTenant.averageSwitchTime,
      duration,
      this.metrics.multiTenant.contextSwitches
    );
  }

  recordIsolationViolation(): void {
    this.metrics.multiTenant.isolationViolations++;
  }

  recordAuditEvent(duration: number, isBatch: boolean = false): void {
    this.metrics.audit.eventsLogged++;
    this.metrics.audit.averageLogTime = MetricsCalculator.calculateAverageTime(
      this.metrics.audit.averageLogTime,
      duration,
      this.metrics.audit.eventsLogged
    );
    
    if (isBatch) {
      this.metrics.audit.batchOperations++;
    }
  }

  getMetrics(): Phase1Metrics & { uptime: number } {
    return {
      ...this.metrics,
      uptime: performance.now() - this.startTime
    };
  }

  getHealthStatus(): HealthStatus {
    return MetricsCalculator.assessHealthStatus(this.metrics);
  }

  reset(): void {
    this.resetMetrics();
  }

  private resetMetrics(): void {
    this.metrics = {
      database: { connectionTime: 0, queryCount: 0, averageQueryTime: 0, slowQueries: 0 },
      rbac: { permissionChecks: 0, averageCheckTime: 0, cacheHitRate: 0 },
      multiTenant: { contextSwitches: 0, averageSwitchTime: 0, isolationViolations: 0 },
      audit: { eventsLogged: 0, averageLogTime: 0, batchOperations: 0 }
    };
    this.startTime = performance.now();
  }

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

export const phase1Monitor = Phase1Monitor.getInstance();
export type { Phase1Metrics, HealthStatus };
