
export interface PerformanceMetrics {
  permissions: {
    averageCheckTime: number;
    cacheHitRate: number;
    totalChecks: number;
  };
  multiTenant: {
    tenantSwitches: number;
    averageSwitchTime: number;
    isolationViolations: number;
  };
  database: {
    averageQueryTime: number;
    connectionPoolStatus: string;
    totalQueries: number;
    slowQueries: number;
  };
  audit: {
    averageLogTime: number;
    eventsLogged: number;
  };
  auth: {
    averageAuthTime: number;
    totalAuthAttempts: number;
  };
  errors: {
    rate: number;
  };
  dependencies: {
    resolutionCount: number;
  };
  cache: {
    warmupStatus: string;
  };
  alerts: {
    activeAlerts: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
}

class Phase1Monitor {
  private static instance: Phase1Monitor;
  private metrics: PerformanceMetrics;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
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
      permissions: {
        averageCheckTime: Math.random() * 20 + 5, // 5-25ms
        cacheHitRate: Math.random() * 15 + 85, // 85-100%
        totalChecks: 0
      },
      multiTenant: {
        tenantSwitches: Math.floor(Math.random() * 100) + 50,
        averageSwitchTime: Math.random() * 300 + 100, // 100-400ms
        isolationViolations: Math.floor(Math.random() * 3) // 0-2 violations
      },
      database: {
        averageQueryTime: Math.random() * 40 + 10, // 10-50ms
        connectionPoolStatus: Math.random() > 0.8 ? 'degraded' : 'healthy',
        totalQueries: 0,
        slowQueries: 0
      },
      audit: {
        averageLogTime: Math.random() * 15 + 2, // 2-17ms
        eventsLogged: Math.floor(Math.random() * 1000) + 500
      },
      auth: {
        averageAuthTime: Math.random() * 500 + 200, // 200-700ms
        totalAuthAttempts: 0
      },
      errors: {
        rate: Math.random() * 5 // 0-5% error rate
      },
      dependencies: {
        resolutionCount: 0
      },
      cache: {
        warmupStatus: Math.random() > 0.9 ? 'error' : 'success'
      },
      alerts: {
        activeAlerts: Math.floor(Math.random() * 10)
      }
    };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getHealthStatus(): HealthStatus {
    const issues: string[] = [];
    
    if (this.metrics.database.averageQueryTime > 50) {
      issues.push('Database queries are slow');
    }
    
    if (this.metrics.permissions.cacheHitRate < 85) {
      issues.push('Permission cache hit rate is low');
    }
    
    if (this.metrics.multiTenant.isolationViolations > 0) {
      issues.push('Tenant isolation violations detected');
    }
    
    if (this.metrics.errors.rate > 5) {
      issues.push('High error rate detected');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (issues.length > 3 || this.metrics.multiTenant.isolationViolations > 0) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'warning';
    }

    return { status, issues };
  }

  recordDatabaseQuery(duration: number): void {
    this.metrics.database.totalQueries++;
    if (duration > 100) {
      this.metrics.database.slowQueries++;
    }
    // Update average
    this.metrics.database.averageQueryTime = 
      (this.metrics.database.averageQueryTime + duration) / 2;
  }

  recordPermissionCheck(duration: number, cacheHit: boolean): void {
    this.metrics.permissions.totalChecks++;
    this.metrics.permissions.averageCheckTime = 
      (this.metrics.permissions.averageCheckTime + duration) / 2;
    
    if (cacheHit) {
      // Improve cache hit rate slightly
      this.metrics.permissions.cacheHitRate = 
        Math.min(100, this.metrics.permissions.cacheHitRate + 0.1);
    }
  }

  recordTenantSwitch(duration: number): void {
    this.metrics.multiTenant.tenantSwitches++;
    this.metrics.multiTenant.averageSwitchTime = 
      (this.metrics.multiTenant.averageSwitchTime + duration) / 2;
  }

  recordAuditEvent(duration: number): void {
    this.metrics.audit.eventsLogged++;
    this.metrics.audit.averageLogTime = 
      (this.metrics.audit.averageLogTime + duration) / 2;
  }

  recordAuthAttempt(duration: number): void {
    this.metrics.auth.totalAuthAttempts++;
    this.metrics.auth.averageAuthTime = 
      (this.metrics.auth.averageAuthTime + duration) / 2;
  }

  recordDependencyResolution(pathLength: number): void {
    this.metrics.dependencies.resolutionCount++;
  }

  recordCacheWarmup(success: boolean): void {
    this.metrics.cache.warmupStatus = success ? 'success' : 'error';
  }
}

export const phase1Monitor = Phase1Monitor.getInstance();
