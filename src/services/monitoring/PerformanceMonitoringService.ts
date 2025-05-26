// Performance Monitoring Service
// Version: 1.0.0 - System Performance Tracking

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  databaseResponseTime: number;
  cacheHitRate: number;
}

export interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds = new Map<string, { warning: number; critical: number }>();

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  constructor() {
    // Set default thresholds
    this.thresholds.set('permission_check_time', { warning: 10, critical: 20 });
    this.thresholds.set('database_response_time', { warning: 50, critical: 100 });
    this.thresholds.set('memory_usage_percent', { warning: 80, critical: 95 });
    this.thresholds.set('cache_hit_rate', { warning: 90, critical: 80 });
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      tags
    };

    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check for threshold violations
    this.checkThresholds(metric);
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let message = '';

    if (metric.value >= threshold.critical) {
      severity = 'critical';
      message = `Critical threshold exceeded for ${metric.name}: ${metric.value} >= ${threshold.critical}`;
    } else if (metric.value >= threshold.warning) {
      severity = 'high';
      message = `Warning threshold exceeded for ${metric.name}: ${metric.value} >= ${threshold.warning}`;
    }

    if (severity !== 'low') {
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        severity,
        message,
        metric: metric.name,
        threshold: severity === 'critical' ? threshold.critical : threshold.warning,
        currentValue: metric.value,
        timestamp: new Date()
      };

      this.alerts.push(alert);
      console.warn(`Performance Alert: ${message}`);
    }
  }

  getMetrics(name?: string, since?: Date): PerformanceMetric[] {
    let filteredMetrics = this.metrics;

    if (name) {
      filteredMetrics = filteredMetrics.filter(m => m.name === name);
    }

    if (since) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= since);
    }

    return filteredMetrics;
  }

  getSystemMetrics(): SystemMetrics {
    const recentMetrics = this.getMetrics(undefined, new Date(Date.now() - 5 * 60 * 1000)); // Last 5 minutes

    const getLatestValue = (metricName: string): number => {
      const metric = recentMetrics
        .filter(m => m.name === metricName)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      return metric?.value || 0;
    };

    return {
      memoryUsage: getLatestValue('memory_usage_percent'),
      cpuUsage: getLatestValue('cpu_usage_percent'),
      networkLatency: getLatestValue('network_latency'),
      databaseResponseTime: getLatestValue('database_response_time'),
      cacheHitRate: getLatestValue('cache_hit_rate')
    };
  }

  getActiveAlerts(): PerformanceAlert[] {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp >= oneHourAgo);
  }

  getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  setThreshold(metricName: string, warning: number, critical: number): void {
    this.thresholds.set(metricName, { warning, critical });
  }

  startPerformanceMonitoring(): void {
    // Monitor system metrics every 30 seconds
    setInterval(() => {
      // Mock system metrics for demonstration
      this.recordMetric('memory_usage_percent', Math.random() * 100);
      this.recordMetric('cpu_usage_percent', Math.random() * 100);
      this.recordMetric('cache_hit_rate', 85 + Math.random() * 15);
    }, 30000);

    console.log('Performance monitoring started');
  }

  generatePerformanceReport(): {
    summary: SystemMetrics;
    alerts: PerformanceAlert[];
    trends: { metric: string; trend: 'up' | 'down' | 'stable' }[];
  } {
    const systemMetrics = this.getSystemMetrics();
    const activeAlerts = this.getActiveAlerts();
    
    // Simple trend analysis
    const trends = ['permission_check_time', 'database_response_time', 'cache_hit_rate'].map(metricName => {
      const recent = this.getMetrics(metricName, new Date(Date.now() - 10 * 60 * 1000));
      if (recent.length < 2) return { metric: metricName, trend: 'stable' as const };
      
      const first = recent[0].value;
      const last = recent[recent.length - 1].value;
      const change = ((last - first) / first) * 100;
      
      return {
        metric: metricName,
        trend: Math.abs(change) < 5 ? 'stable' : change > 0 ? 'up' : 'down'
      };
    });

    return {
      summary: systemMetrics,
      alerts: activeAlerts,
      trends
    };
  }
}

export const performanceMonitoringService = PerformanceMonitoringService.getInstance();
