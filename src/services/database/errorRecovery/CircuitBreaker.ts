
// Circuit Breaker Implementation
// Extracted from errorRecovery.ts for focused circuit breaking logic

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeMs: number;
  monitoringWindowMs: number;
}

export interface CircuitMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  circuitBreakerTrips: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private circuitBreakerTrips = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private stateChangeTime = Date.now();

  constructor(private config: CircuitBreakerConfig) {}

  canExecute(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (Date.now() - this.stateChangeTime >= this.config.recoveryTimeMs) {
        this.state = 'HALF_OPEN';
        this.stateChangeTime = Date.now();
        return true;
      }
      return false;
    }

    // HALF_OPEN state
    return true;
  }

  onSuccess(operationName: string): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
      this.stateChangeTime = Date.now();
      console.log(`🔄 Circuit breaker CLOSED for ${operationName} after successful recovery`);
    }
  }

  onFailure(operationName: string): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.circuitBreakerTrips++;
      this.stateChangeTime = Date.now();
      console.warn(`⚡ Circuit breaker OPEN for ${operationName} after ${this.failures} failures`);
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.circuitBreakerTrips++;
      this.stateChangeTime = Date.now();
      console.warn(`⚡ Circuit breaker reopened for ${operationName} after failed recovery attempt`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): CircuitMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      circuitBreakerTrips: this.circuitBreakerTrips,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.stateChangeTime = Date.now();
    console.log('🔄 Circuit breaker manually reset');
  }
}
