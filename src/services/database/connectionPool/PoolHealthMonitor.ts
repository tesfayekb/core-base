
// Connection Pool Health Monitoring
// Extracted from ConnectionPool for better separation of concerns

import { SupabaseClient } from '@supabase/supabase-js';

export interface PoolHealthMetrics {
  healthyConnections: number;
  totalChecks: number;
  failedChecks: number;
  lastCheckTime: Date;
}

export interface PoolHealthStatus {
  healthy: boolean;
  issues: string[];
  utilization: number;
}

export class PoolHealthMonitor {
  private metrics: PoolHealthMetrics = {
    healthyConnections: 0,
    totalChecks: 0,
    failedChecks: 0,
    lastCheckTime: new Date()
  };

  private healthCheckInterval?: NodeJS.Timeout;

  /**
   * Start periodic health monitoring
   */
  startHealthCheck(
    activeConnections: Set<SupabaseClient>,
    idleConnections: SupabaseClient[],
    intervalMs: number
  ): void {
    this.healthCheckInterval = setInterval(async () => {
      this.metrics.healthyConnections = 0;
      this.metrics.lastCheckTime = new Date();
      
      // Check active connections
      for (const client of activeConnections) {
        await this.checkConnectionHealth(client);
      }
      
      // Check idle connections
      for (const client of idleConnections) {
        await this.checkConnectionHealth(client);
      }
      
      const health = this.getHealthStatus(activeConnections.size, 10, 0); // max 10 for example
      if (!health.healthy) {
        console.warn('⚠️ Connection pool health issues:', health.issues);
      }
    }, intervalMs);
  }

  /**
   * Check if a single connection is healthy
   */
  async checkConnectionHealth(client: SupabaseClient): Promise<boolean> {
    try {
      this.metrics.totalChecks++;
      const { error } = await client.auth.getSession();
      if (!error) {
        this.metrics.healthyConnections++;
        return true;
      } else {
        this.metrics.failedChecks++;
        return false;
      }
    } catch (error) {
      this.metrics.failedChecks++;
      console.error('❌ Connection health check failed:', error);
      return false;
    }
  }

  /**
   * Get health status assessment
   */
  getHealthStatus(
    activeConnections: number,
    maxConnections: number,
    minConnections: number,
    waitingRequests = 0
  ): PoolHealthStatus {
    const issues: string[] = [];
    const utilization = activeConnections / maxConnections;

    if (this.metrics.healthyConnections < minConnections) {
      issues.push('Below minimum healthy connections');
    }

    if (utilization > 0.8) {
      issues.push('High connection utilization (>80%)');
    }

    if (waitingRequests > 0) {
      issues.push(`${waitingRequests} requests waiting for connections`);
    }

    if (this.metrics.failedChecks > this.metrics.totalChecks * 0.1) {
      issues.push('High health check failure rate (>10%)');
    }

    return {
      healthy: issues.length === 0,
      issues,
      utilization
    };
  }

  /**
   * Get health metrics
   */
  getMetrics(): PoolHealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Stop health monitoring
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      healthyConnections: 0,
      totalChecks: 0,
      failedChecks: 0,
      lastCheckTime: new Date()
    };
  }
}
