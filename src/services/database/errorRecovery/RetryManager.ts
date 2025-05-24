
// Retry Management Utilities
// Extracted from DatabaseErrorRecovery for better separation of concerns

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RetryMetrics {
  retriedOperations: number;
  averageRetryDelay: number;
}

export class RetryManager {
  private metrics: RetryMetrics = {
    retriedOperations: 0,
    averageRetryDelay: 0
  };

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`🎯 Executing ${operationName} (attempt ${attempt}/${config.maxAttempts})`);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ ${operationName} failed (attempt ${attempt}):`, lastError.message);

        // Check if error is retryable
        if (!this.isRetryableError(lastError, config.retryableErrors)) {
          console.log(`🚫 Non-retryable error for ${operationName}, failing immediately`);
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

    this.updateAverageRetryDelay(totalDelay);
    throw lastError!;
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
   * Get retry metrics
   */
  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      retriedOperations: 0,
      averageRetryDelay: 0
    };
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
