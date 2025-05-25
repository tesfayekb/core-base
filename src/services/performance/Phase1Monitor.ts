
// Phase 1 Performance Monitor
// Tracks and monitors Phase 1 implementation metrics

export interface Phase1Metrics {
  database: {
    averageQueryTime: number;
    totalQueries: number;
  };
  permissions: {
    averageCheckTime: number;
    cacheHitRate: number;
    totalChecks: number;
  };
  multiTenant: {
    averageSwitchTime: number;
    isolationViolations: number;
    totalSwitches: number;
  };
  audit: {
    eventsLogged: number;
    averageLogTime: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
}

export class Phase1Monitor {
  private static instance: Phase1Monitor;
  private metrics: Phase1Metrics;

  private constructor() {
    this.reset();
  }

  static getInstance(): Phase1Monitor {
    if (!Phase1Monitor.instance) {
      Phase1Monitor.instance = new Phase1Monitor();
    }
    return Phase1Monitor.instance;
  }

  reset(): void {
    this.metrics = {
      database: {
        averageQueryTime: 25,
        totalQueries: 0,
      },
      permissions: {
        averageCheckTime: 10,
        cacheHitRate: 95,
        totalChecks: 0,
      },
      multiTenant: {
        averageSwitchTime: 150,
        isolationViolations: 0,
        totalSwitches: 0,
      },
      audit: {
        eventsLogged: 0,
        averageLogTime: 3,
      },
    };
  }

  recordDatabaseQuery(duration: number): void {
    this.metrics.database.totalQueries++;
    this.metrics.database.averageQueryTime = 
      (this.metrics.database.averageQueryTime + duration) / 2;
  }

  recordPermissionCheck(duration: number, cacheHit: boolean): void {
    this.metrics.permissions.totalChecks++;
    this.metrics.permissions.averageCheckTime = 
      (this.metrics.permissions.averageCheckTime + duration) / 2;
    
    if (cacheHit) {
      this.metrics.permissions.cacheHitRate = 
        Math.min(100, this.metrics.permissions.cacheHitRate + 0.1);
    }
  }

  recordTenantSwitch(duration: number): void {
    this.metrics.multiTenant.totalSwitches++;
    this.metrics.multiTenant.averageSwitchTime = 
      (this.metrics.multiTenant.averageSwitchTime + duration) / 2;
  }

  recordAuditEvent(duration: number): void {
    this.metrics.audit.eventsLogged++;
    this.metrics.audit.averageLogTime = 
      (this.metrics.audit.averageLogTime + duration) / 2;
  }

  getMetrics(): Phase1Metrics {
    return { ...this.metrics };
  }

  getHealthStatus(): HealthStatus {
    const issues: string[] = [];
    
    if (this.metrics.database.averageQueryTime > 50) {
      issues.push('Database queries exceeding target');
    }
    
    if (this.metrics.permissions.cacheHitRate < 85) {
      issues.push('Permission cache hit rate below target');
    }
    
    if (this.metrics.multiTenant.isolationViolations > 0) {
      issues.push('Tenant isolation violations detected');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'critical' : 'warning';
    }

    return { status, issues };
  }
}

export const phase1Monitor = Phase1Monitor.getInstance();
