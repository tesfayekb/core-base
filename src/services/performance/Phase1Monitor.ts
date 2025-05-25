
// Phase 1 Performance Monitor
// Tracks and monitors Phase 1 implementation metrics

export interface Phase1Metrics {
  database: {
    averageQueryTime: number;
    totalQueries: number;
    slowQueries: number;
    connectionPoolStatus: 'healthy' | 'warning' | 'critical';
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
  dependencies: {
    resolutionCount: number;
    averageResolutionTime: number;
  };
  cache: {
    warmupStatus: 'idle' | 'warming' | 'complete' | 'error';
    hitRate: number;
  };
  alerts: {
    activeAlerts: number;
    totalAlerts: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  score: number;
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
        slowQueries: 0,
        connectionPoolStatus: 'healthy',
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
      dependencies: {
        resolutionCount: 0,
        averageResolutionTime: 12,
      },
      cache: {
        warmupStatus: 'idle',
        hitRate: 85,
      },
      alerts: {
        activeAlerts: 0,
        totalAlerts: 0,
      },
    };
  }

  recordDatabaseQuery(duration: number): void {
    this.metrics.database.totalQueries++;
    this.metrics.database.averageQueryTime = 
      (this.metrics.database.averageQueryTime + duration) / 2;
    
    if (duration > 100) {
      this.metrics.database.slowQueries++;
    }
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

  recordDependencyResolution(resolutionSteps: number): void {
    this.metrics.dependencies.resolutionCount++;
    this.metrics.dependencies.averageResolutionTime = 
      (this.metrics.dependencies.averageResolutionTime + resolutionSteps * 2) / 2;
  }

  recordCacheWarmup(status: 'idle' | 'warming' | 'complete' | 'error', hitRate?: number): void {
    this.metrics.cache.warmupStatus = status;
    if (hitRate !== undefined) {
      this.metrics.cache.hitRate = hitRate;
    }
  }

  getMetrics(): Phase1Metrics {
    return { ...this.metrics };
  }

  getHealthStatus(): HealthStatus {
    const issues: string[] = [];
    let score = 100;
    
    if (this.metrics.database.averageQueryTime > 50) {
      issues.push('Database queries exceeding target');
      score -= 15;
    }
    
    if (this.metrics.permissions.cacheHitRate < 85) {
      issues.push('Permission cache hit rate below target');
      score -= 10;
    }
    
    if (this.metrics.multiTenant.isolationViolations > 0) {
      issues.push('Tenant isolation violations detected');
      score -= 30;
    }

    if (this.metrics.cache.warmupStatus === 'error') {
      issues.push('Cache warming errors detected');
      score -= 15;
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (score < 70) {
      status = 'critical';
    } else if (score < 85) {
      status = 'warning';
    }

    return { status, issues, score };
  }
}

export const phase1Monitor = Phase1Monitor.getInstance();
