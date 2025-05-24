
// Connection Pool Health Monitoring
// Extracted from connectionPool.ts for focused health management

import { SupabaseClient } from '@supabase/supabase-js';

export interface PoolHealthMetrics {
  healthyConnections: number;
  unhealthyConnections: number;
  lastHealthCheck: Date;
  healthCheckCount: number;
  averageResponseTime: number;
}

export class PoolHealthMonitor {
  private metrics: PoolHealthMetrics = {
    healthyConnections: 0,
    unhealthyConnections: 0,
    lastHealthCheck: new Date(),
    healthCheckCount: 0,
    averageResponseTime: 0
  };

  private healthCheckInterval?: NodeJS.Timeout;

  async checkConnectionHealth(client: SupabaseClient): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const { error } = await client.auth.getSession();
      const responseTime = performance.now() - startTime;
      
      this.updateResponseTime(responseTime);
      
      if (error && error.message.includes('network')) {
        this.metrics.unhealthyConnections++;
        return false;
      }
      
      this.metrics.healthyConnections++;
      return true;
    } catch (error) {
      this.metrics.unhealthyConnections++;
      return false;
    } finally {
      this.metrics.lastHealthCheck = new Date();
      this.metrics.healthCheckCount++;
    }
  }

  private updateResponseTime(responseTime: number): void {
    const total = this.metrics.averageResponseTime * (this.metrics.healthCheckCount - 1);
    this.metrics.averageResponseTime = (total + responseTime) / this.metrics.healthCheckCount;
  }

  startHealthCheck(
    activeConnections: Set<SupabaseClient>,
    idlePool: SupabaseClient[],
    intervalMs: number
  ): void {
    this.healthCheckInterval = setInterval(async () => {
      // Check a sample of active connections
      const activeArray = Array.from(activeConnections);
      if (activeArray.length > 0) {
        const sampleConnection = activeArray[0];
        await this.checkConnectionHealth(sampleConnection);
      }
      
      // Check idle connections periodically
      if (idlePool.length > 0) {
        const idleConnection = idlePool[0];
        await this.checkConnectionHealth(idleConnection);
      }
    }, intervalMs);
  }

  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  getMetrics(): PoolHealthMetrics {
    return { ...this.metrics };
  }

  getHealthStatus(
    activeConnections: number,
    maxConnections: number,
    minConnections: number,
    waitingRequests: number
  ): {
    healthy: boolean;
    issues: string[];
    utilization: number;
  } {
    const issues: string[] = [];
    const utilization = activeConnections / maxConnections;

    if (utilization > 0.9) {
      issues.push('High connection pool utilization (>90%)');
    }

    if (waitingRequests > 5) {
      issues.push(`High number of waiting requests: ${waitingRequests}`);
    }

    if (this.metrics.averageResponseTime > 1000) {
      issues.push(`Slow health check response time: ${this.metrics.averageResponseTime.toFixed(0)}ms`);
    }

    const unhealthyRatio = this.metrics.unhealthyConnections / 
      (this.metrics.healthyConnections + this.metrics.unhealthyConnections || 1);
    
    if (unhealthyRatio > 0.1) {
      issues.push(`High unhealthy connection rate: ${(unhealthyRatio * 100).toFixed(1)}%`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      utilization
    };
  }
}
