
// Database Health Monitoring Service
// Extracted from DatabaseService for better separation of concerns

import { phase1Monitor } from '../../performance/Phase1Monitor';
import { connectionPool } from '../connectionPool';
import { errorRecovery } from '../errorRecovery';
import { alertingSystem } from '../../monitoring/alertingSystem';

export interface DatabaseHealthStatus {
  healthy: boolean;
  issues: string[];
  components: Record<string, any>;
}

export interface DatabaseMetrics {
  database: any;
  connectionPool?: any;
  errorRecovery?: any;
  alerts?: any;
}

export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private monitoringInterval?: NodeJS.Timeout;

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  /**
   * Start performance monitoring and alerting
   */
  startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Collect metrics from various sources
        const metrics = {
          database: phase1Monitor.getMetrics(),
          connectionPool: connectionPool.getMetrics(),
          errorRecovery: errorRecovery.getMetrics(),
          rbac: phase1Monitor.getMetrics().rbac,
          multiTenant: phase1Monitor.getMetrics().multiTenant
        };

        // Check for alerts
        await alertingSystem.checkAlerts(metrics);
        
        // Log health status periodically
        const health = this.getHealthStatus(true, true);
        if (!health.healthy) {
          console.warn('⚠️ Database service health issues:', health.issues);
        }
      } catch (error) {
        console.error('❌ Monitoring check failed:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Get comprehensive health status
   */
  getHealthStatus(enableConnectionPooling = true, enableErrorRecovery = true): DatabaseHealthStatus {
    const issues: string[] = [];
    const components: Record<string, any> = {};

    // Database performance health
    const dbHealth = phase1Monitor.getHealthStatus();
    components.database = dbHealth;
    if (dbHealth.status !== 'healthy') {
      issues.push(...dbHealth.issues);
    }

    // Connection pool health
    if (enableConnectionPooling) {
      const poolHealth = connectionPool.getHealthStatus();
      components.connectionPool = poolHealth;
      if (!poolHealth.healthy) {
        issues.push(...poolHealth.issues);
      }
    }

    // Error recovery health
    if (enableErrorRecovery) {
      const recoveryHealth = errorRecovery.getHealthStatus();
      components.errorRecovery = recoveryHealth;
      if (!recoveryHealth.healthy) {
        issues.push(...recoveryHealth.issues);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      components
    };
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(enableConnectionPooling = true, enableErrorRecovery = true, enableMonitoring = true): DatabaseMetrics {
    const metrics: DatabaseMetrics = {
      database: phase1Monitor.getMetrics()
    };

    if (enableConnectionPooling) {
      metrics.connectionPool = connectionPool.getMetrics();
    }

    if (enableErrorRecovery) {
      metrics.errorRecovery = errorRecovery.getMetrics();
    }

    if (enableMonitoring) {
      metrics.alerts = alertingSystem.getAlertStats();
    }

    return metrics;
  }

  /**
   * Cleanup monitoring resources
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

export const databaseHealthMonitor = DatabaseHealthMonitor.getInstance();
