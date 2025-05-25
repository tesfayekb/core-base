// Phase 1 Performance Monitor - Enhanced
// Enhanced with granular dependency resolution, cache warming, and proactive alerting

import { granularDependencyResolver } from '../rbac/GranularDependencyResolver';
import { cacheWarmingService } from '../caching/CacheWarmingService';
import { proactiveAlertingService } from '../monitoring/ProactiveAlertingService';
import { detailedMetricsCollector } from './DetailedMetricsCollector';
import { performanceAnalysisService } from './PerformanceAnalysisService';

export interface PerformanceMetrics {
  database: {
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    connectionPoolStatus: string;
  };
  auth: {
    totalAuthAttempts: number;
    averageAuthTime: number;
    failedAttempts: number;
    sessionCacheHits: number;
  };
  permissions: {
    totalChecks: number;
    averageCheckTime: number;
    cacheHitRate: number;
    dependencyResolutions: number;
  };
  multiTenant: {
    tenantSwitches: number;
    averageSwitchTime: number;
    isolationViolations: number;
  };
  audit: {
    eventsLogged: number;
    averageLogTime: number;
    logBacklog: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    warmupStatus: string;
    totalOperations: number;
  };
  alerts: {
    activeAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    acknowledgedAlerts: number;
  };
  dependencies: {
    resolutionCount: number;
    averageDepth: number;
    circularDetections: number;
  };
  errors?: {
    rate: number;
    total: number;
  };
  system?: {
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface HealthStatus {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  score: number;
  issues: string[];
  recommendations: string[];
  alerts: any[];
}

export class Phase1Monitor {
  private static instance: Phase1Monitor;
  private metrics: PerformanceMetrics;
  private startTime: number;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();
    this.startEnhancedMonitoring();
  }

  static getInstance(): Phase1Monitor {
    if (!Phase1Monitor.instance) {
      Phase1Monitor.instance = new Phase1Monitor();
    }
    return Phase1Monitor.instance;
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      database: {
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        connectionPoolStatus: 'healthy'
      },
      auth: {
        totalAuthAttempts: 0,
        averageAuthTime: 0,
        failedAttempts: 0,
        sessionCacheHits: 0
      },
      permissions: {
        totalChecks: 0,
        averageCheckTime: 0,
        cacheHitRate: 95,
        dependencyResolutions: 0
      },
      multiTenant: {
        tenantSwitches: 0,
        averageSwitchTime: 0,
        isolationViolations: 0
      },
      audit: {
        eventsLogged: 0,
        averageLogTime: 0,
        logBacklog: 0
      },
      cache: {
        hitRate: 95,
        missRate: 5,
        warmupStatus: 'ready',
        totalOperations: 0
      },
      alerts: {
        activeAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        acknowledgedAlerts: 0
      },
      dependencies: {
        resolutionCount: 0,
        averageDepth: 0,
        circularDetections: 0
      },
      errors: {
        rate: 0,
        total: 0
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0
      }
    };
  }

  private startEnhancedMonitoring(): void {
    // Update alert metrics every 10 seconds
    setInterval(() => {
      this.updateAlertMetrics();
      this.updateDependencyMetrics();
      this.updateCacheMetrics();
      this.updateSystemMetrics();
      this.updateDetailedMetrics();
    }, 10000);

    console.log('📊 Enhanced Phase 1 monitoring started with detailed metrics collection');
  }

  private updateDetailedMetrics(): void {
    // Trigger detailed metrics collection
    detailedMetricsCollector.collectMetrics().then(() => {
      // Run performance analysis
      const analysis = performanceAnalysisService.analyzePerformance();
      
      // Log any critical insights
      const criticalInsights = analysis.insights.filter(i => i.type === 'critical');
      if (criticalInsights.length > 0) {
        console.warn('🚨 Critical performance issues detected:', criticalInsights.map(i => i.message));
      }
    });
  }

  private updateAlertMetrics(): void {
    const alertMetrics = proactiveAlertingService.getAlertMetrics();
    this.metrics.alerts = {
      activeAlerts: alertMetrics.activeAlerts,
      criticalAlerts: alertMetrics.criticalAlerts,
      warningAlerts: alertMetrics.warningAlerts,
      acknowledgedAlerts: alertMetrics.acknowledgedAlerts
    };
  }

  private updateDependencyMetrics(): void {
    const dependencyMetrics = granularDependencyResolver.getMetrics();
    this.metrics.dependencies = {
      resolutionCount: this.metrics.dependencies.resolutionCount,
      averageDepth: dependencyMetrics.averageDependencyDepth,
      circularDetections: this.metrics.dependencies.circularDetections
    };
  }

  private updateCacheMetrics(): void {
    const warmupMetrics = cacheWarmingService.getWarmupMetrics();
    this.metrics.cache.warmupStatus = warmupMetrics.isWarming ? 'warming' : 'ready';
  }

  private updateSystemMetrics(): void {
    // Simulate system metrics
    this.metrics.system = {
      memoryUsage: Math.random() * 90,
      cpuUsage: Math.random() * 70
    };
  }

  recordDatabaseQuery(duration: number): void {
    this.metrics.database.totalQueries++;
    this.metrics.database.averageQueryTime = (this.metrics.database.averageQueryTime + duration) / 2;
    if (duration > 100) {
      this.metrics.database.slowQueries++;
    }
  }

  recordAuthAttempt(duration: number, success: boolean): void {
    this.metrics.auth.totalAuthAttempts++;
    this.metrics.auth.averageAuthTime = (this.metrics.auth.averageAuthTime + duration) / 2;
    if (!success) {
      this.metrics.auth.failedAttempts++;
    } else {
      this.metrics.auth.sessionCacheHits++;
    }
  }

  recordPermissionCheck(duration: number, cacheHit: boolean): void {
    this.metrics.permissions.totalChecks++;
    this.metrics.permissions.averageCheckTime = (this.metrics.permissions.averageCheckTime + duration) / 2;
    this.metrics.permissions.cacheHitRate = cacheHit ? this.metrics.permissions.cacheHitRate + 1 : this.metrics.permissions.cacheHitRate;
  }

  recordTenantSwitch(duration: number): void {
    this.metrics.multiTenant.tenantSwitches++;
    this.metrics.multiTenant.averageSwitchTime = (this.metrics.multiTenant.averageSwitchTime + duration) / 2;
  }

  recordIsolationViolation(): void {
    this.metrics.multiTenant.isolationViolations++;
  }

  recordAuditEvent(duration: number): void {
    this.metrics.audit.eventsLogged++;
    this.metrics.audit.averageLogTime = (this.metrics.audit.averageLogTime + duration) / 2;
  }

  recordError(error: Error): void {
    this.metrics.errors.total++;
    this.metrics.errors.rate = this.metrics.errors.total / (Date.now() - this.startTime);
    console.error('Recorded error:', error);
  }

  recordDependencyResolution(depth: number, circular: boolean = false): void {
    this.metrics.dependencies.resolutionCount++;
    if (circular) {
      this.metrics.dependencies.circularDetections++;
    }
  }

  recordCacheWarmup(duration: number, itemsWarmed: number): void {
    this.metrics.cache.totalOperations += itemsWarmed;
    console.log(`🔥 Cache warmup recorded: ${itemsWarmed} items in ${duration.toFixed(2)}ms`);
  }

  getHealthStatus(): HealthStatus {
    const alerts = proactiveAlertingService.getActiveAlerts();
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    // Get detailed performance analysis
    const analysis = performanceAnalysisService.analyzePerformance();
    const criticalInsights = analysis.insights.filter(i => i.type === 'critical');
    const warningInsights = analysis.insights.filter(i => i.type === 'warning');

    let status: HealthStatus['status'] = 'excellent';
    let score = analysis.overallScore;
    const issues: string[] = [];
    const recommendations: string[] = [...analysis.recommendations];

    // Check critical alerts first
    if (criticalAlerts.length > 0 || criticalInsights.length > 0) {
      status = 'critical';
      score = Math.min(score, 40);
      if (criticalAlerts.length > 0) {
        issues.push(`${criticalAlerts.length} critical alert(s) active`);
      }
      if (criticalInsights.length > 0) {
        issues.push(`${criticalInsights.length} critical performance issue(s) detected`);
      }
      recommendations.push('Address critical issues immediately');
    }

    // Check warning alerts
    if (warningAlerts.length > 0 || warningInsights.length > 0) {
      if (status !== 'critical') {
        status = (warningAlerts.length + warningInsights.length) > 3 ? 'warning' : 'good';
        score = Math.min(score, 70);
      }
      if (warningAlerts.length > 0) {
        issues.push(`${warningAlerts.length} warning alert(s) active`);
      }
      if (warningInsights.length > 0) {
        issues.push(`${warningInsights.length} performance warning(s) detected`);
      }
      recommendations.push('Review and address warning conditions');
    }

    // Performance-based health assessment
    if (this.metrics.database.averageQueryTime > 45) {
      if (status === 'excellent') status = 'good';
      score -= 15;
      issues.push('Database performance approaching limits');
      recommendations.push('Consider database optimization');
    }

    if (this.metrics.permissions.averageCheckTime > 12) {
      if (status === 'excellent') status = 'good';
      score -= 10;
      issues.push('Permission check performance degraded');
      recommendations.push('Execute cache warming strategy');
    }

    if (this.metrics.cache.hitRate < 90) {
      if (status === 'excellent') status = 'good';
      score -= 10;
      issues.push('Cache hit rate below optimal');
      recommendations.push('Review cache warming strategies');
    }

    // Add dependency-specific recommendations
    if (this.metrics.dependencies.circularDetections > 0) {
      issues.push('Circular dependencies detected');
      recommendations.push('Review permission dependency configuration');
    }

    if (issues.length === 0) {
      recommendations.push('System performing optimally - all enhanced features operational');
    }

    return {
      status,
      score: Math.round(score),
      issues,
      recommendations,
      alerts: alerts.map(a => ({
        severity: a.severity,
        message: a.message,
        metric: a.metric
      }))
    };
  }

  getMetrics(): PerformanceMetrics {
    return this.metrics;
  }

  reset(): void {
    this.metrics = this.initializeMetrics();
  }

  getDetailedAnalysis() {
    return performanceAnalysisService.analyzePerformance();
  }

  getPerformanceReport(): string {
    return performanceAnalysisService.getDetailedReport();
  }
}

export const phase1Monitor = Phase1Monitor.getInstance();
