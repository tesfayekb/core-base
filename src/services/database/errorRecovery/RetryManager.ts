
// Retry Management System
// Extracted from errorRecovery.ts for focused retry logic

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RetryMetrics {
  retriedOperations: number;
  totalRetryAttempts: number;
  averageRetryDelay: number;
  successfulRetries: number;
}

export class RetryManager {
  private metrics: RetryMetrics = {
    retriedOperations: 0,
    totalRetryAttempts: 0,
    averageRetryDelay: 0,
    successfulRetries: 0
  };

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;
    let totalDelay = 0;

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        if (attempt > 0) {
          this.metrics.successfulRetries++;
          this.updateAverageDelay(totalDelay);
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === 0) {
          this.metrics.retriedOperations++;
        }
        
        // Check if error is retryable
        if (!this.isRetryableError(lastError, config.retryableErrors)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === config.maxAttempts - 1) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelayMs
        );

        totalDelay += delay;
        this.metrics.totalRetryAttempts++;

        console.warn(`⏳ Retrying ${operationName} in ${delay}ms (attempt ${attempt + 1}/${config.maxAttempts})`);
        await this.sleep(delay);
      }
    }

    this.updateAverageDelay(totalDelay);
    throw lastError!;
  }

  private isRetryableError(error: Error, retryableErrors: string[]): boolean {
    return retryableErrors.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase()) ||
      error.name.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateAverageDelay(delay: number): void {
    const total = this.metrics.averageRetryDelay * (this.metrics.retriedOperations - 1);
    this.metrics.averageRetryDelay = (total + delay) / this.metrics.retriedOperations;
  }

  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      retriedOperations: 0,
      totalRetryAttempts: 0,
      averageRetryDelay: 0,
      successfulRetries: 0
    };
  }
}
