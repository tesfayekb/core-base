
// Database Error Recovery System - Refactored
// Version: 2.0.0
// Phase 1.2: Enhanced Database Foundation - Error Recovery

import { CircuitBreaker, CircuitBreakerConfig, CircuitState } from './errorRecovery/CircuitBreaker';
import { RetryManager, RetryConfig } from './errorRecovery/RetryManager';

export interface RecoveryMetrics {
  totalOperations: number;
  failedOperations: number;
  retriedOperations: number;
  circuitBreakerTrips: number;
  averageRetryDelay: number;
  reliability: number;
  lastError?: string;
  lastErrorTime?: Date;
}

export class DatabaseErrorRecovery {
  private static instance: DatabaseErrorRecovery;
  
  private circuitBreaker: CircuitBreaker;
  private retryManager: RetryManager;
  
  private metrics: RecoveryMetrics = {
    totalOperations: 0,
    failedOperations: 0,
    retriedOperations: 0,
    circuitBreakerTrips: 0,
    averageRetryDelay: 0,
    reliability: 1.0
  };

  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'connection_error',
      'timeout',
      'network_error'
    ]
  };

  private readonly defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeMs: 60000, // 1 minute
    monitoringWindowMs: 300000 // 5 minutes
  };

  constructor() {
    this.circuitBreaker = new CircuitBreaker(this.defaultCircuitConfig);
    this.retryManager = new RetryManager();
  }

  static getInstance(): DatabaseErrorRecovery {
    if (!DatabaseErrorRecovery.instance) {
      DatabaseErrorRecovery.instance = new DatabaseErrorRecovery();
    }
    return DatabaseErrorRecovery.instance;
  }

  /**
   * Execute operation with retry and circuit breaker protection
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    this.metrics.totalOperations++;

    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      throw new Error(`Circuit breaker OPEN for ${operationName}. Recovery time not elapsed.`);
    }

    try {
      const result = await this.retryManager.executeWithRetry(operation, operationName, config);
      this.onSuccess(operationName);
      return result;
    } catch (error) {
      this.onFailure(operationName, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(operationName: string): void {
    this.circuitBreaker.onSuccess(operationName);
    this.updateReliability();
  }

  /**
   * Handle failed operation
   */
  private onFailure(operationName: string, error: Error): void {
    this.metrics.failedOperations++;
    this.metrics.lastError = error.message;
    this.metrics.lastErrorTime = new Date();
    
    this.circuitBreaker.onFailure(operationName);
    this.updateReliability();
  }

  /**
   * Update reliability metric
   */
  private updateReliability(): void {
    if (this.metrics.totalOperations > 0) {
      this.metrics.reliability = 1 - (this.metrics.failedOperations / this.metrics.totalOperations);
    }
  }

  /**
   * Get current recovery metrics
   */
  getMetrics(): RecoveryMetrics & { circuitState: CircuitState } {
    const retryMetrics = this.retryManager.getMetrics();
    const circuitMetrics = this.circuitBreaker.getMetrics();
    
    return {
      ...this.metrics,
      retriedOperations: retryMetrics.retriedOperations,
      averageRetryDelay: retryMetrics.averageRetryDelay,
      circuitBreakerTrips: circuitMetrics.circuitBreakerTrips,
      circuitState: circuitMetrics.state
    };
  }

  /**
   * Get recovery system health status
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    reliability: number;
  } {
    const issues: string[] = [];
    const failureRate = this.metrics.totalOperations > 0 
      ? this.metrics.failedOperations / this.metrics.totalOperations 
      : 0;
    
    const reliability = 1 - failureRate;
    const circuitState = this.circuitBreaker.getState();

    if (circuitState === 'OPEN') {
      issues.push('Circuit breaker is OPEN - blocking operations');
    }

    if (failureRate > 0.1) {
      issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }

    const circuitTrips = this.circuitBreaker.getMetrics().circuitBreakerTrips;
    if (circuitTrips > 5) {
      issues.push(`Frequent circuit breaker trips: ${circuitTrips}`);
    }

    const avgRetryDelay = this.retryManager.getMetrics().averageRetryDelay;
    if (avgRetryDelay > 5000) {
      issues.push(`High average retry delay: ${avgRetryDelay.toFixed(0)}ms`);
    }

    return {
      healthy: issues.length === 0 && reliability > 0.95,
      issues,
      reliability
    };
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      failedOperations: 0,
      retriedOperations: 0,
      circuitBreakerTrips: 0,
      averageRetryDelay: 0,
      reliability: 1.0
    };
    this.retryManager.resetMetrics();
    console.log('📊 Recovery metrics reset');
  }
}

// Export singleton instance
export const errorRecovery = DatabaseErrorRecovery.getInstance();

// Re-export types for convenience
export type { RetryConfig, CircuitBreakerConfig, CircuitState };
