
// Database Performance Alerting System
// Version: 1.0.0
// Phase 1.2: Enhanced Database Foundation - Monitoring & Alerting

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'performance' | 'error' | 'security' | 'capacity';

export interface Alert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  severity: AlertSeverity;
  condition: (metrics: any) => boolean;
  message: (metrics: any) => string;
  cooldownMs: number;
  enabled: boolean;
}

export interface AlertingConfig {
  enableEmailAlerts: boolean;
  enableSlackAlerts: boolean;
  emailRecipients: string[];
  slackWebhookUrl?: string;
  alertRetentionDays: number;
}

export class DatabaseAlertingSystem {
  private static instance: DatabaseAlertingSystem;
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private lastAlertTimes = new Map<string, number>();
  
  private readonly defaultConfig: AlertingConfig = {
    enableEmailAlerts: false,
    enableSlackAlerts: false,
    emailRecipients: [],
    alertRetentionDays: 30
  };

  constructor(private config: AlertingConfig = this.defaultConfig) {
    this.initializeDefaultRules();
    this.startAlertCleanup();
  }

  static getInstance(config?: AlertingConfig): DatabaseAlertingSystem {
    if (!DatabaseAlertingSystem.instance) {
      DatabaseAlertingSystem.instance = new DatabaseAlertingSystem(config);
    }
    return DatabaseAlertingSystem.instance;
  }

  /**
   * Initialize default alerting rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-query-time',
        name: 'High Database Query Time',
        category: 'performance',
        severity: 'warning',
        condition: (metrics) => metrics.database?.averageQueryTime > 100,
        message: (metrics) => `Average query time is ${metrics.database.averageQueryTime.toFixed(2)}ms (threshold: 100ms)`,
        cooldownMs: 300000, // 5 minutes
        enabled: true
      },
      {
        id: 'connection-pool-exhausted',
        name: 'Connection Pool Near Exhaustion',
        category: 'capacity',
        severity: 'critical',
        condition: (metrics) => metrics.connectionPool?.utilization > 0.9,
        message: (metrics) => `Connection pool utilization is ${(metrics.connectionPool.utilization * 100).toFixed(1)}% (threshold: 90%)`,
        cooldownMs: 180000, // 3 minutes
        enabled: true
      },
      {
        id: 'high-error-rate',
        name: 'High Database Error Rate',
        category: 'error',
        severity: 'critical',
        condition: (metrics) => metrics.errorRecovery?.reliability < 0.9,
        message: (metrics) => `Database reliability is ${(metrics.errorRecovery.reliability * 100).toFixed(1)}% (threshold: 90%)`,
        cooldownMs: 600000, // 10 minutes
        enabled: true
      },
      {
        id: 'circuit-breaker-open',
        name: 'Circuit Breaker Open',
        category: 'error',
        severity: 'critical',
        condition: (metrics) => metrics.errorRecovery?.circuitState === 'OPEN',
        message: () => 'Database circuit breaker is OPEN - operations are being blocked',
        cooldownMs: 60000, // 1 minute
        enabled: true
      },
      {
        id: 'slow-permission-checks',
        name: 'Slow Permission Checks',
        category: 'performance',
        severity: 'warning',
        condition: (metrics) => metrics.rbac?.averageCheckTime > 20,
        message: (metrics) => `Average permission check time is ${metrics.rbac.averageCheckTime.toFixed(2)}ms (threshold: 20ms)`,
        cooldownMs: 300000, // 5 minutes
        enabled: true
      },
      {
        id: 'tenant-isolation-violation',
        name: 'Tenant Isolation Violation',
        category: 'security',
        severity: 'critical',
        condition: (metrics) => metrics.multiTenant?.isolationViolations > 0,
        message: (metrics) => `${metrics.multiTenant.isolationViolations} tenant isolation violations detected`,
        cooldownMs: 0, // Immediate alerting for security issues
        enabled: true
      }
    ];

    this.alertRules = defaultRules;
    console.log(`📋 Initialized ${defaultRules.length} default alert rules`);
  }

  /**
   * Check metrics against alert rules and trigger alerts
   */
  async checkAlerts(metrics: any): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        // Check cooldown period
        const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0;
        const timeSinceLastAlert = Date.now() - lastAlertTime;
        
        if (timeSinceLastAlert < rule.cooldownMs) {
          continue;
        }

        // Evaluate rule condition
        if (rule.condition(metrics)) {
          const alert = await this.createAlert(rule, metrics);
          triggeredAlerts.push(alert);
          this.lastAlertTimes.set(rule.id, Date.now());
          
          console.warn(`🚨 Alert triggered: ${alert.title}`);
        }
      } catch (error) {
        console.error(`❌ Error evaluating alert rule ${rule.id}:`, error);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Create an alert from a triggered rule
   */
  private async createAlert(rule: AlertRule, metrics: any): Promise<Alert> {
    const alert: Alert = {
      id: `${rule.id}-${Date.now()}`,
      category: rule.category,
      severity: rule.severity,
      title: rule.name,
      message: rule.message(metrics),
      timestamp: new Date(),
      acknowledged: false,
      metadata: { ruleId: rule.id, metrics }
    };

    this.alerts.push(alert);

    // Send notifications
    await this.sendNotifications(alert);

    return alert;
  }

  /**
   * Send alert notifications
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    try {
      // Console notification (always enabled)
      this.logAlert(alert);

      // Email notifications
      if (this.config.enableEmailAlerts && this.config.emailRecipients.length > 0) {
        await this.sendEmailAlert(alert);
      }

      // Slack notifications
      if (this.config.enableSlackAlerts && this.config.slackWebhookUrl) {
        await this.sendSlackAlert(alert);
      }
    } catch (error) {
      console.error('❌ Failed to send alert notifications:', error);
    }
  }

  /**
   * Log alert to console with appropriate formatting
   */
  private logAlert(alert: Alert): void {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    }[alert.severity];

    const timestamp = alert.timestamp.toISOString();
    console.log(`${emoji} [${timestamp}] ${alert.severity.toUpperCase()}: ${alert.title}`);
    console.log(`   ${alert.message}`);
  }

  /**
   * Send email alert (placeholder implementation)
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // In a real implementation, this would integrate with an email service
    console.log(`📧 Email alert would be sent to: ${this.config.emailRecipients.join(', ')}`);
    console.log(`   Subject: [${alert.severity.toUpperCase()}] ${alert.title}`);
    console.log(`   Body: ${alert.message}`);
  }

  /**
   * Send Slack alert (placeholder implementation)
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    // In a real implementation, this would post to Slack webhook
    const color = {
      info: '#36a64f',
      warning: '#ff9500',
      critical: '#ff0000'
    }[alert.severity];

    console.log(`💬 Slack alert would be sent to webhook: ${this.config.slackWebhookUrl}`);
    console.log(`   Color: ${color}, Title: ${alert.title}, Message: ${alert.message}`);
  }

  /**
   * Get current alerts
   */
  getAlerts(filters?: {
    category?: AlertCategory;
    severity?: AlertSeverity;
    acknowledged?: boolean;
    limit?: number;
  }): Alert[] {
    let filteredAlerts = [...this.alerts];

    if (filters?.category) {
      filteredAlerts = filteredAlerts.filter(a => a.category === filters.category);
    }
    if (filters?.severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === filters.severity);
    }
    if (filters?.acknowledged !== undefined) {
      filteredAlerts = filteredAlerts.filter(a => a.acknowledged === filters.acknowledged);
    }

    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filters?.limit ? filteredAlerts.slice(0, filters.limit) : filteredAlerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      console.log(`✅ Alert acknowledged: ${alert.title}`);
      return true;
    }
    return false;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    bySeverity: Record<AlertSeverity, number>;
    byCategory: Record<AlertCategory, number>;
    acknowledged: number;
    recent24h: number;
  } {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return {
      total: this.alerts.length,
      bySeverity: {
        info: this.alerts.filter(a => a.severity === 'info').length,
        warning: this.alerts.filter(a => a.severity === 'warning').length,
        critical: this.alerts.filter(a => a.severity === 'critical').length
      },
      byCategory: {
        performance: this.alerts.filter(a => a.category === 'performance').length,
        error: this.alerts.filter(a => a.category === 'error').length,
        security: this.alerts.filter(a => a.category === 'security').length,
        capacity: this.alerts.filter(a => a.category === 'capacity').length
      },
      acknowledged: this.alerts.filter(a => a.acknowledged).length,
      recent24h: this.alerts.filter(a => a.timestamp.getTime() > oneDayAgo).length
    };
  }

  /**
   * Clean up old alerts periodically
   */
  private startAlertCleanup(): void {
    setInterval(() => {
      const cutoffDate = new Date(Date.now() - this.config.alertRetentionDays * 24 * 60 * 60 * 1000);
      const initialCount = this.alerts.length;
      
      this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoffDate);
      
      const removedCount = initialCount - this.alerts.length;
      if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} old alerts`);
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    console.log(`📋 Added custom alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const initialLength = this.alertRules.length;
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
    return this.alertRules.length < initialLength;
  }
}

// Export singleton instance
export const alertingSystem = DatabaseAlertingSystem.getInstance();
