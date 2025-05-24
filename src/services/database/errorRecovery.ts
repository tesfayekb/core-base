
// Database Error Recovery System
// Version: 1.0.0
// Phase 1.2: Enhanced Database Foundation - Error Recovery

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeMs: number;
  monitoringWindowMs: number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface RecoveryMetrics {
  totalOperations: number;
  failedOperations: number;
  retriedOperations: number;
  circuitBreakerTrips: number;
  averageRetryDelay: number;
  lastError?: string;
  lastErrorTime?: Date;
}

export class DatabaseErrorRecovery {
  private static instance: DatabaseErrorRecovery;
  
  private circuitState: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  
  private metrics: RecoveryMetrics = {
    totalOperations: 0,
    failedOperations: 0,
    retriedOperations: 0,
    circuitBreakerTrips: 0,
    averageRetryDelay: 0
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
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.defaultCircuitConfig.recoveryTimeMs) {
        throw new Error(`Circuit breaker OPEN for ${operationName}. Recovery time not elapsed.`);
      } else {
        this.circuitState = 'HALF_OPEN';
        console.log(`🔄 Circuit breaker moving to HALF_OPEN for ${operationName}`);
      }
    }

    let lastError: Error;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`🎯 Executing ${operationName} (attempt ${attempt}/${config.maxAttempts})`);
        
        const result = await operation();
        
        // Success - reset circuit breaker if needed
        this.onSuccess(operationName);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ ${operationName} failed (attempt ${attempt}):`, lastError.message);

        // Check if error is retryable
        if (!this.isRetryableError(lastError, config.retryableErrors)) {
          console.log(`🚫 Non-retryable error for ${operationName}, failing immediately`);
          this.onFailure(operationName, lastError);
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );
        
        totalDelay += delay;
        this.metrics.retriedOperations++;
        
        console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    // All attempts failed
    this.onFailure(operationName, lastError!);
    this.updateAverageRetryDelay(totalDelay);
    throw lastError!;
  }

  /**
   * Handle successful operation
   */
  private onSuccess(operationName: string): void {
    if (this.circuitState === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close circuit
        this.circuitState = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        console.log(`✅ Circuit breaker CLOSED for ${operationName} after recovery`);
      }
    } else if (this.circuitState === 'CLOSED') {
      // Reset failure count on success in normal operation
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(operationName: string, error: Error): void {
    this.metrics.failedOperations++;
    this.metrics.lastError = error.message;
    this.metrics.lastErrorTime = new Date();
    
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Check if circuit breaker should trip
    if (this.circuitState === 'CLOSED' && 
        this.failureCount >= this.defaultCircuitConfig.failureThreshold) {
      this.circuitState = 'OPEN';
      this.metrics.circuitBreakerTrips++;
      console.error(`🔴 Circuit breaker OPEN for ${operationName} after ${this.failureCount} failures`);
    } else if (this.circuitState === 'HALF_OPEN') {
      // Failure in half-open state - go back to open
      this.circuitState = 'OPEN';
      this.successCount = 0;
      console.error(`🔴 Circuit breaker back to OPEN for ${operationName} - recovery failed`);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, retryableErrors: string[]): boolean {
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  /**
   * Update average retry delay metric
   */
  private updateAverageRetryDelay(totalDelay: number): void {
    const currentAverage = this.metrics.averageRetryDelay;
    const retriedOps = this.metrics.retriedOperations;
    
    this.metrics.averageRetryDelay = 
      (currentAverage * (retriedOps - 1) + totalDelay) / retriedOps;
  }

  /**
   * Get current recovery metrics
   */
  getMetrics(): RecoveryMetrics & { circuitState: CircuitState } {
    return {
      ...this.metrics,
      circuitState: this.circuitState
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

    if (this.circuitState === 'OPEN') {
      issues.push('Circuit breaker is OPEN - blocking operations');
    }

    if (failureRate > 0.1) {
      issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }

    if (this.metrics.circuitBreakerTrips > 5) {
      issues.push(`Frequent circuit breaker trips: ${this.metrics.circuitBreakerTrips}`);
    }

    if (this.metrics.averageRetryDelay > 5000) {
      issues.push(`High average retry delay: ${this.metrics.averageRetryDelay.toFixed(0)}ms`);
    }

    return {
      healthy: issues.length === 0 && reliability > 0.95,
      issues,
      reliability
    };
  }

  /**
   * Reset circuit breaker manually (for testing/emergency)
   */
  resetCircuitBreaker(): void {
    this.circuitState = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    console.log('🔄 Circuit breaker manually reset to CLOSED');
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
      averageRetryDelay: 0
    };
    console.log('📊 Recovery metrics reset');
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorRecovery = DatabaseErrorRecovery.getInstance();
