
// Circuit Breaker Implementation
// Extracted from DatabaseErrorRecovery for better separation of concerns

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeMs: number;
  monitoringWindowMs: number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerMetrics {
  circuitBreakerTrips: number;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private trips = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Check if operation should be allowed
   */
  canExecute(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeMs) {
        return false;
      } else {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker moving to HALF_OPEN');
        return true;
      }
    }
    return true;
  }

  /**
   * Record successful operation
   */
  onSuccess(operationName: string): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close circuit
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        console.log(`✅ Circuit breaker CLOSED for ${operationName} after recovery`);
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in normal operation
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Record failed operation
   */
  onFailure(operationName: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Check if circuit breaker should trip
    if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.trips++;
      console.error(`🔴 Circuit breaker OPEN for ${operationName} after ${this.failureCount} failures`);
    } else if (this.state === 'HALF_OPEN') {
      // Failure in half-open state - go back to open
      this.state = 'OPEN';
      this.successCount = 0;
      console.error(`🔴 Circuit breaker back to OPEN for ${operationName} - recovery failed`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      circuitBreakerTrips: this.trips,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Reset circuit breaker manually
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    console.log('🔄 Circuit breaker manually reset to CLOSED');
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}
