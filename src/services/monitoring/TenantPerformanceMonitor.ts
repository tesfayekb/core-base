// Tenant Performance Monitoring Service
// Tracks per-tenant performance metrics and resource usage

export interface TenantPerformanceMetrics {
  tenantId: string;
  timestamp: number;
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
    entryCount: number;
  };
  permissionMetrics: {
    avgResolutionTime: number;
    peakResolutionTime: number;
    checksPerSecond: number;
    errorRate: number;
  };
  resourceUsage: {
    cpuUsage: number;
    memoryUsage: number;
    databaseQueries: number;
    apiCalls: number;
    storageUsage: number;
  };
  userActivity: {
    activeUsers: number;
    sessionCount: number;
    requestCount: number;
    errorCount: number;
  };
}

export interface TenantPerformanceAlert {
  id: string;
  tenantId: string;
  type: 'performance' | 'resource' | 'security' | 'cache';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  resolved: boolean;
}

export class TenantPerformanceMonitor {
  private static instance: TenantPerformanceMonitor;
  private tenantMetrics = new Map<string, TenantPerformanceMetrics[]>();
  private tenantAlerts = new Map<string, TenantPerformanceAlert[]>();
  private monitoringInterval?: NodeJS.Timeout;
  private readonly METRICS_RETENTION_HOURS = 24;
  private readonly MAX_METRICS_PER_TENANT = 1440; // 24 hours of minute-by-minute data

  static getInstance(): TenantPerformanceMonitor {
    if (!TenantPerformanceMonitor.instance) {
      TenantPerformanceMonitor.instance = new TenantPerformanceMonitor();
    }
    return TenantPerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectTenantMetrics();
    }, 60000); // Collect every minute

    console.log('Tenant performance monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log('Tenant performance monitoring stopped');
  }

  recordTenantMetric(tenantId: string, metrics: Partial<TenantPerformanceMetrics>): void {
    const fullMetrics: TenantPerformanceMetrics = {
      tenantId,
      timestamp: Date.now(),
      cacheMetrics: {
        hitRate: 0,
        missRate: 0,
        evictionRate: 0,
        memoryUsage: 0,
        entryCount: 0,
        ...metrics.cacheMetrics
      },
      permissionMetrics: {
        avgResolutionTime: 0,
        peakResolutionTime: 0,
        checksPerSecond: 0,
        errorRate: 0,
        ...metrics.permissionMetrics
      },
      resourceUsage: {
        cpuUsage: 0,
        memoryUsage: 0,
        databaseQueries: 0,
        apiCalls: 0,
        storageUsage: 0,
        ...metrics.resourceUsage
      },
      userActivity: {
        activeUsers: 0,
        sessionCount: 0,
        requestCount: 0,
        errorCount: 0,
        ...metrics.userActivity
      }
    };

    if (!this.tenantMetrics.has(tenantId)) {
      this.tenantMetrics.set(tenantId, []);
    }

    const tenantMetricsList = this.tenantMetrics.get(tenantId)!;
    tenantMetricsList.push(fullMetrics);

    // Keep only recent metrics
    if (tenantMetricsList.length > this.MAX_METRICS_PER_TENANT) {
      tenantMetricsList.splice(0, tenantMetricsList.length - this.MAX_METRICS_PER_TENANT);
    }

    // Check for performance alerts
    this.checkPerformanceThresholds(tenantId, fullMetrics);
  }

  getTenantMetrics(
    tenantId: string,
    timeRange?: { start: number; end: number }
  ): TenantPerformanceMetrics[] {
    const metrics = this.tenantMetrics.get(tenantId) || [];
    
    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  getTenantPerformanceSummary(tenantId: string): {
    averageMetrics: TenantPerformanceMetrics;
    trends: Record<string, 'improving' | 'stable' | 'degrading'>;
    alerts: TenantPerformanceAlert[];
  } {
    const metrics = this.getTenantMetrics(tenantId);
    const alerts = this.tenantAlerts.get(tenantId) || [];

    if (metrics.length === 0) {
      return {
        averageMetrics: this.createEmptyMetrics(tenantId),
        trends: {},
        alerts: []
      };
    }

    const averageMetrics = this.calculateAverageMetrics(metrics);
    const trends = this.calculateTrends(metrics);

    return {
      averageMetrics,
      trends,
      alerts: alerts.filter(a => !a.resolved)
    };
  }

  getResourceUsageReport(tenantId: string): {
    current: TenantPerformanceMetrics['resourceUsage'];
    daily: TenantPerformanceMetrics['resourceUsage'];
    weekly: TenantPerformanceMetrics['resourceUsage'];
    quotaUsage: Record<string, number>;
  } {
    const metrics = this.getTenantMetrics(tenantId);
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const currentMetrics = metrics[metrics.length - 1];
    const dailyMetrics = metrics.filter(m => m.timestamp >= oneDayAgo);
    const weeklyMetrics = metrics.filter(m => m.timestamp >= oneWeekAgo);

    return {
      current: currentMetrics?.resourceUsage || this.createEmptyResourceUsage(),
      daily: this.averageResourceUsage(dailyMetrics),
      weekly: this.averageResourceUsage(weeklyMetrics),
      quotaUsage: this.calculateQuotaUsage(tenantId, currentMetrics?.resourceUsage)
    };
  }

  private collectTenantMetrics(): void {
    // In a real implementation, this would collect metrics from various sources
    const activeTenants = Array.from(this.tenantMetrics.keys());
    
    for (const tenantId of activeTenants) {
      // Simulate metric collection
      const simulatedMetrics: Partial<TenantPerformanceMetrics> = {
        cacheMetrics: {
          hitRate: Math.random() * 100,
          missRate: Math.random() * 20,
          evictionRate: Math.random() * 5,
          memoryUsage: Math.random() * 1024 * 1024 * 50, // Up to 50MB
          entryCount: Math.floor(Math.random() * 1000)
        },
        permissionMetrics: {
          avgResolutionTime: Math.random() * 50,
          peakResolutionTime: Math.random() * 200,
          checksPerSecond: Math.random() * 100,
          errorRate: Math.random() * 2
        },
        resourceUsage: {
          cpuUsage: Math.random() * 100,
          memoryUsage: Math.random() * 1024 * 1024 * 100, // Up to 100MB
          databaseQueries: Math.floor(Math.random() * 50),
          apiCalls: Math.floor(Math.random() * 100),
          storageUsage: Math.random() * 1024 * 1024 * 1024 // Up to 1GB
        },
        userActivity: {
          activeUsers: Math.floor(Math.random() * 50),
          sessionCount: Math.floor(Math.random() * 100),
          requestCount: Math.floor(Math.random() * 500),
          errorCount: Math.floor(Math.random() * 10)
        }
      };

      this.recordTenantMetric(tenantId, simulatedMetrics);
    }
  }

  private checkPerformanceThresholds(
    tenantId: string,
    metrics: TenantPerformanceMetrics
  ): void {
    const alerts: TenantPerformanceAlert[] = [];

    // Cache performance alerts
    if (metrics.cacheMetrics.hitRate < 80) {
      alerts.push(this.createAlert(
        tenantId,
        'cache',
        'medium',
        'Cache hit rate below optimal threshold',
        80,
        metrics.cacheMetrics.hitRate
      ));
    }

    // Permission resolution alerts
    if (metrics.permissionMetrics.avgResolutionTime > 30) {
      alerts.push(this.createAlert(
        tenantId,
        'performance',
        'high',
        'Permission resolution time exceeding target',
        30,
        metrics.permissionMetrics.avgResolutionTime
      ));
    }

    // Resource usage alerts
    if (metrics.resourceUsage.cpuUsage > 80) {
      alerts.push(this.createAlert(
        tenantId,
        'resource',
        'high',
        'CPU usage above threshold',
        80,
        metrics.resourceUsage.cpuUsage
      ));
    }

    if (metrics.resourceUsage.memoryUsage > 80 * 1024 * 1024) { // 80MB
      alerts.push(this.createAlert(
        tenantId,
        'resource',
        'medium',
        'Memory usage above threshold',
        80 * 1024 * 1024,
        metrics.resourceUsage.memoryUsage
      ));
    }

    // Add alerts to tenant alerts list
    if (alerts.length > 0) {
      if (!this.tenantAlerts.has(tenantId)) {
        this.tenantAlerts.set(tenantId, []);
      }
      this.tenantAlerts.get(tenantId)!.push(...alerts);
    }
  }

  private createAlert(
    tenantId: string,
    type: TenantPerformanceAlert['type'],
    severity: TenantPerformanceAlert['severity'],
    message: string,
    threshold: number,
    currentValue: number
  ): TenantPerformanceAlert {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      type,
      severity,
      message,
      threshold,
      currentValue,
      timestamp: Date.now(),
      resolved: false
    };
  }

  private createEmptyMetrics(tenantId: string): TenantPerformanceMetrics {
    return {
      tenantId,
      timestamp: Date.now(),
      cacheMetrics: { hitRate: 0, missRate: 0, evictionRate: 0, memoryUsage: 0, entryCount: 0 },
      permissionMetrics: { avgResolutionTime: 0, peakResolutionTime: 0, checksPerSecond: 0, errorRate: 0 },
      resourceUsage: { cpuUsage: 0, memoryUsage: 0, databaseQueries: 0, apiCalls: 0, storageUsage: 0 },
      userActivity: { activeUsers: 0, sessionCount: 0, requestCount: 0, errorCount: 0 }
    };
  }

  private createEmptyResourceUsage(): TenantPerformanceMetrics['resourceUsage'] {
    return { cpuUsage: 0, memoryUsage: 0, databaseQueries: 0, apiCalls: 0, storageUsage: 0 };
  }

  private calculateAverageMetrics(metrics: TenantPerformanceMetrics[]): TenantPerformanceMetrics {
    if (metrics.length === 0) {
      return this.createEmptyMetrics(metrics[0]?.tenantId || '');
    }

    const avg = metrics.reduce((acc, m) => ({
      tenantId: m.tenantId,
      timestamp: Math.max(acc.timestamp, m.timestamp),
      cacheMetrics: {
        hitRate: acc.cacheMetrics.hitRate + m.cacheMetrics.hitRate,
        missRate: acc.cacheMetrics.missRate + m.cacheMetrics.missRate,
        evictionRate: acc.cacheMetrics.evictionRate + m.cacheMetrics.evictionRate,
        memoryUsage: acc.cacheMetrics.memoryUsage + m.cacheMetrics.memoryUsage,
        entryCount: acc.cacheMetrics.entryCount + m.cacheMetrics.entryCount
      },
      permissionMetrics: {
        avgResolutionTime: acc.permissionMetrics.avgResolutionTime + m.permissionMetrics.avgResolutionTime,
        peakResolutionTime: Math.max(acc.permissionMetrics.peakResolutionTime, m.permissionMetrics.peakResolutionTime),
        checksPerSecond: acc.permissionMetrics.checksPerSecond + m.permissionMetrics.checksPerSecond,
        errorRate: acc.permissionMetrics.errorRate + m.permissionMetrics.errorRate
      },
      resourceUsage: {
        cpuUsage: acc.resourceUsage.cpuUsage + m.resourceUsage.cpuUsage,
        memoryUsage: acc.resourceUsage.memoryUsage + m.resourceUsage.memoryUsage,
        databaseQueries: acc.resourceUsage.databaseQueries + m.resourceUsage.databaseQueries,
        apiCalls: acc.resourceUsage.apiCalls + m.resourceUsage.apiCalls,
        storageUsage: acc.resourceUsage.storageUsage + m.resourceUsage.storageUsage
      },
      userActivity: {
        activeUsers: acc.userActivity.activeUsers + m.userActivity.activeUsers,
        sessionCount: acc.userActivity.sessionCount + m.userActivity.sessionCount,
        requestCount: acc.userActivity.requestCount + m.userActivity.requestCount,
        errorCount: acc.userActivity.errorCount + m.userActivity.errorCount
      }
    }), this.createEmptyMetrics(metrics[0].tenantId));

    const count = metrics.length;
    return {
      ...avg,
      cacheMetrics: {
        hitRate: avg.cacheMetrics.hitRate / count,
        missRate: avg.cacheMetrics.missRate / count,
        evictionRate: avg.cacheMetrics.evictionRate / count,
        memoryUsage: avg.cacheMetrics.memoryUsage / count,
        entryCount: avg.cacheMetrics.entryCount / count
      },
      permissionMetrics: {
        avgResolutionTime: avg.permissionMetrics.avgResolutionTime / count,
        peakResolutionTime: avg.permissionMetrics.peakResolutionTime,
        checksPerSecond: avg.permissionMetrics.checksPerSecond / count,
        errorRate: avg.permissionMetrics.errorRate / count
      },
      resourceUsage: {
        cpuUsage: avg.resourceUsage.cpuUsage / count,
        memoryUsage: avg.resourceUsage.memoryUsage / count,
        databaseQueries: avg.resourceUsage.databaseQueries / count,
        apiCalls: avg.resourceUsage.apiCalls / count,
        storageUsage: avg.resourceUsage.storageUsage / count
      },
      userActivity: {
        activeUsers: avg.userActivity.activeUsers / count,
        sessionCount: avg.userActivity.sessionCount / count,
        requestCount: avg.userActivity.requestCount / count,
        errorCount: avg.userActivity.errorCount / count
      }
    };
  }

  private calculateTrends(metrics: TenantPerformanceMetrics[]): Record<string, 'improving' | 'stable' | 'degrading'> {
    if (metrics.length < 2) {
      return {};
    }

    const recent = metrics.slice(-5); // Last 5 data points
    const older = metrics.slice(-10, -5); // Previous 5 data points

    if (recent.length === 0 || older.length === 0) {
      return {};
    }

    const recentAvg = this.calculateAverageMetrics(recent);
    const olderAvg = this.calculateAverageMetrics(older);

    return {
      cacheHitRate: this.compareTrend(recentAvg.cacheMetrics.hitRate, olderAvg.cacheMetrics.hitRate, true),
      permissionResolutionTime: this.compareTrend(recentAvg.permissionMetrics.avgResolutionTime, olderAvg.permissionMetrics.avgResolutionTime, false),
      cpuUsage: this.compareTrend(recentAvg.resourceUsage.cpuUsage, olderAvg.resourceUsage.cpuUsage, false),
      memoryUsage: this.compareTrend(recentAvg.resourceUsage.memoryUsage, olderAvg.resourceUsage.memoryUsage, false),
      errorRate: this.compareTrend(recentAvg.permissionMetrics.errorRate, olderAvg.permissionMetrics.errorRate, false)
    };
  }

  private compareTrend(current: number, previous: number, higherIsBetter: boolean): 'improving' | 'stable' | 'degrading' {
    const threshold = 0.05; // 5% change threshold
    const percentChange = Math.abs(current - previous) / previous;

    if (percentChange < threshold) {
      return 'stable';
    }

    const isImproving = higherIsBetter ? current > previous : current < previous;
    return isImproving ? 'improving' : 'degrading';
  }

  private averageResourceUsage(metrics: TenantPerformanceMetrics[]): TenantPerformanceMetrics['resourceUsage'] {
    if (metrics.length === 0) {
      return this.createEmptyResourceUsage();
    }

    const avg = metrics.reduce((acc, m) => ({
      cpuUsage: acc.cpuUsage + m.resourceUsage.cpuUsage,
      memoryUsage: acc.memoryUsage + m.resourceUsage.memoryUsage,
      databaseQueries: acc.databaseQueries + m.resourceUsage.databaseQueries,
      apiCalls: acc.apiCalls + m.resourceUsage.apiCalls,
      storageUsage: acc.storageUsage + m.resourceUsage.storageUsage
    }), this.createEmptyResourceUsage());

    const count = metrics.length;
    return {
      cpuUsage: avg.cpuUsage / count,
      memoryUsage: avg.memoryUsage / count,
      databaseQueries: avg.databaseQueries / count,
      apiCalls: avg.apiCalls / count,
      storageUsage: avg.storageUsage / count
    };
  }

  private calculateQuotaUsage(
    tenantId: string,
    resourceUsage?: TenantPerformanceMetrics['resourceUsage']
  ): Record<string, number> {
    if (!resourceUsage) {
      return {};
    }

    // Define tenant quotas (in a real implementation, these would come from tenant configuration)
    const quotas = {
      cpuUsage: 100, // 100% CPU
      memoryUsage: 100 * 1024 * 1024, // 100MB
      databaseQueries: 1000, // per minute
      apiCalls: 5000, // per minute
      storageUsage: 1024 * 1024 * 1024 // 1GB
    };

    return {
      cpuUsage: (resourceUsage.cpuUsage / quotas.cpuUsage) * 100,
      memoryUsage: (resourceUsage.memoryUsage / quotas.memoryUsage) * 100,
      databaseQueries: (resourceUsage.databaseQueries / quotas.databaseQueries) * 100,
      apiCalls: (resourceUsage.apiCalls / quotas.apiCalls) * 100,
      storageUsage: (resourceUsage.storageUsage / quotas.storageUsage) * 100
    };
  }
}

export const tenantPerformanceMonitor = TenantPerformanceMonitor.getInstance();
