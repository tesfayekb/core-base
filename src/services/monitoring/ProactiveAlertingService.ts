
// Proactive Alerting Service
// Advanced monitoring with proactive alerting for performance degradation

import { phase1Monitor } from '../performance/Phase1Monitor';

export interface AlertThreshold {
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  unit: string;
  trendWindow: number; // minutes
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolutionSuggestion?: string;
}

export interface AlertRule {
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  resolutionSuggestion: string;
  cooldownMinutes: number;
}

export class ProactiveAlertingService {
  private static instance: ProactiveAlertingService;
  private alerts: Alert[] = [];
  private alertThresholds = new Map<string, AlertThreshold>();
  private alertRules: AlertRule[] = [];
  private alertHistory: Alert[] = [];
  private alertCooldowns = new Map<string, number>();

  static getInstance(): ProactiveAlertingService {
    if (!ProactiveAlertingService.instance) {
      ProactiveAlertingService.instance = new ProactiveAlertingService();
    }
    return ProactiveAlertingService.instance;
  }

  private constructor() {
    this.initializeAlertThresholds();
    this.initializeAlertRules();
    this.startMonitoring();
  }

  private initializeAlertThresholds(): void {
    // Database performance thresholds
    this.alertThresholds.set('database_query_time', {
      metric: 'database_query_time',
      warningThreshold: 40,
      criticalThreshold: 60,
      unit: 'ms',
      trendWindow: 5
    });

    // Permission check performance thresholds
    this.alertThresholds.set('permission_check_time', {
      metric: 'permission_check_time',
      warningThreshold: 12,
      criticalThreshold: 20,
      unit: 'ms',
      trendWindow: 3
    });

    // Authentication performance thresholds
    this.alertThresholds.set('auth_time', {
      metric: 'auth_time',
      warningThreshold: 180,
      criticalThreshold: 250,
      unit: 'ms',
      trendWindow: 5
    });

    // Memory usage thresholds
    this.alertThresholds.set('memory_usage', {
      metric: 'memory_usage',
      warningThreshold: 80,
      criticalThreshold: 95,
      unit: '%',
      trendWindow: 10
    });

    // Cache hit rate thresholds
    this.alertThresholds.set('cache_hit_rate', {
      metric: 'cache_hit_rate',
      warningThreshold: 85,
      criticalThreshold: 70,
      unit: '%',
      trendWindow: 5
    });
  }

  private initializeAlertRules(): void {
    // Performance degradation trending alert
    this.alertRules.push({
      name: 'performance_trend_degradation',
      condition: (metrics) => {
        const currentDbTime = metrics.database?.averageQueryTime || 0;
        const currentPermTime = metrics.permissions?.averageCheckTime || 0;
        return currentDbTime > 35 && currentPermTime > 10;
      },
      severity: 'warning',
      message: 'Performance trending towards warning thresholds',
      resolutionSuggestion: 'Consider cache warming or query optimization',
      cooldownMinutes: 15
    });

    // Critical system health alert
    this.alertRules.push({
      name: 'critical_system_health',
      condition: (metrics) => {
        const health = phase1Monitor.getHealthStatus();
        return health.status === 'critical';
      },
      severity: 'critical',
      message: 'System health is critical - immediate attention required',
      resolutionSuggestion: 'Check system resources and restart services if necessary',
      cooldownMinutes: 5
    });

    // Cache performance degradation
    this.alertRules.push({
      name: 'cache_performance_degradation',
      condition: (metrics) => {
        return metrics.cache?.hitRate < 90;
      },
      severity: 'warning',
      message: 'Cache hit rate below optimal threshold',
      resolutionSuggestion: 'Execute cache warming strategy or review cache configuration',
      cooldownMinutes: 10
    });

    // Tenant switching performance
    this.alertRules.push({
      name: 'tenant_switching_slow',
      condition: (metrics) => {
        return metrics.multiTenant?.averageSwitchTime > 150;
      },
      severity: 'warning',
      message: 'Tenant switching performance degraded',
      resolutionSuggestion: 'Review tenant context caching and database connections',
      cooldownMinutes: 10
    });

    // Predictive failure detection
    this.alertRules.push({
      name: 'predictive_failure_detection',
      condition: (metrics) => {
        const errorRate = metrics.errors?.rate || 0;
        const responseTime = metrics.database?.averageQueryTime || 0;
        return errorRate > 0.02 && responseTime > 45; // 2% error rate + slow responses
      },
      severity: 'critical',
      message: 'Predictive analysis indicates potential system failure',
      resolutionSuggestion: 'Immediate investigation recommended - check logs and system resources',
      cooldownMinutes: 5
    });
  }

  private startMonitoring(): void {
    // Check for alerts every 30 seconds
    setInterval(() => {
      this.evaluateAlerts();
    }, 30000);

    console.log('🔔 Proactive alerting service started - monitoring for performance degradation');
  }

  private evaluateAlerts(): void {
    const metrics = phase1Monitor.getMetrics();
    const currentTime = Date.now();

    // Evaluate threshold-based alerts
    this.alertThresholds.forEach((threshold, metricName) => {
      const currentValue = this.getMetricValue(metrics, metricName);
      if (currentValue !== null) {
        this.checkThreshold(metricName, currentValue, threshold);
      }
    });

    // Evaluate rule-based alerts
    this.alertRules.forEach(rule => {
      const lastAlert = currentTime - (this.alertCooldowns.get(rule.name) || 0);
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;

      if (lastAlert > cooldownMs && rule.condition(metrics)) {
        this.createAlert({
          id: `${rule.name}_${currentTime}`,
          severity: rule.severity,
          metric: rule.name,
          currentValue: 0,
          threshold: 0,
          message: rule.message,
          timestamp: currentTime,
          acknowledged: false,
          resolutionSuggestion: rule.resolutionSuggestion
        });

        this.alertCooldowns.set(rule.name, currentTime);
      }
    });
  }

  private getMetricValue(metrics: any, metricName: string): number | null {
    switch (metricName) {
      case 'database_query_time':
        return metrics.database?.averageQueryTime || null;
      case 'permission_check_time':
        return metrics.permissions?.averageCheckTime || null;
      case 'auth_time':
        return metrics.auth?.averageAuthTime || null;
      case 'memory_usage':
        return metrics.system?.memoryUsage || null;
      case 'cache_hit_rate':
        return metrics.cache?.hitRate || null;
      default:
        return null;
    }
  }

  private checkThreshold(metricName: string, currentValue: number, threshold: AlertThreshold): void {
    if (currentValue >= threshold.criticalThreshold) {
      this.createAlert({
        id: `${metricName}_critical_${Date.now()}`,
        severity: 'critical',
        metric: metricName,
        currentValue,
        threshold: threshold.criticalThreshold,
        message: `${metricName} exceeded critical threshold: ${currentValue}${threshold.unit} >= ${threshold.criticalThreshold}${threshold.unit}`,
        timestamp: Date.now(),
        acknowledged: false,
        resolutionSuggestion: this.getResolutionSuggestion(metricName, 'critical')
      });
    } else if (currentValue >= threshold.warningThreshold) {
      this.createAlert({
        id: `${metricName}_warning_${Date.now()}`,
        severity: 'warning',
        metric: metricName,
        currentValue,
        threshold: threshold.warningThreshold,
        message: `${metricName} exceeded warning threshold: ${currentValue}${threshold.unit} >= ${threshold.warningThreshold}${threshold.unit}`,
        timestamp: Date.now(),
        acknowledged: false,
        resolutionSuggestion: this.getResolutionSuggestion(metricName, 'warning')
      });
    }
  }

  private getResolutionSuggestion(metricName: string, severity: string): string {
    const suggestions: Record<string, Record<string, string>> = {
      database_query_time: {
        warning: 'Review slow queries and consider adding database indexes',
        critical: 'Immediate database optimization required - check connection pool and query plans'
      },
      permission_check_time: {
        warning: 'Execute cache warming strategy for permission system',
        critical: 'Critical permission system performance - restart permission cache service'
      },
      auth_time: {
        warning: 'Review authentication service performance and session cache',
        critical: 'Authentication system critical - check auth service health'
      },
      memory_usage: {
        warning: 'Monitor memory usage patterns and consider garbage collection',
        critical: 'Critical memory usage - immediate investigation required'
      },
      cache_hit_rate: {
        warning: 'Execute cache warming strategy to improve hit rate',
        critical: 'Cache system degraded - review cache configuration and connectivity'
      }
    };

    return suggestions[metricName]?.[severity] || 'Review system metrics and logs for more information';
  }

  private createAlert(alert: Alert): void {
    // Avoid duplicate alerts for the same metric within a short timeframe
    const recentAlert = this.alerts.find(a => 
      a.metric === alert.metric && 
      a.severity === alert.severity &&
      (Date.now() - a.timestamp) < 60000 // Within last minute
    );

    if (!recentAlert) {
      this.alerts.push(alert);
      this.alertHistory.push(alert);
      console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
      
      if (alert.resolutionSuggestion) {
        console.warn(`💡 Suggestion: ${alert.resolutionSuggestion}`);
      }
    }
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`✅ Alert acknowledged: ${alert.message}`);
      return true;
    }
    return false;
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  getAlertHistory(): Alert[] {
    return [...this.alertHistory];
  }

  getAlertMetrics(): {
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    acknowledgedAlerts: number;
    averageResolutionTime: number;
  } {
    const totalAlerts = this.alertHistory.length;
    const activeAlerts = this.getActiveAlerts().length;
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = this.alerts.filter(a => a.severity === 'warning').length;
    const acknowledgedAlerts = this.alerts.filter(a => a.acknowledged).length;

    // Calculate average resolution time for acknowledged alerts
    const acknowledgedWithTime = this.alerts.filter(a => a.acknowledged);
    const averageResolutionTime = acknowledgedWithTime.length > 0
      ? acknowledgedWithTime.reduce((sum, a) => sum + (Date.now() - a.timestamp), 0) / acknowledgedWithTime.length
      : 0;

    return {
      totalAlerts,
      activeAlerts,
      criticalAlerts,
      warningAlerts,
      acknowledgedAlerts,
      averageResolutionTime
    };
  }
}

export const proactiveAlertingService = ProactiveAlertingService.getInstance();
