
// Performance Measurement Infrastructure - MANDATORY for all operations
// Following src/docs/implementation/PERFORMANCE_MEASUREMENT_INFRASTRUCTURE.md

export interface PerformanceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  validation: {
    passed: boolean;
    target: number;
    actual: number;
    recommendations?: string[];
  };
}

export type OperationType = 
  | 'simpleQuery' 
  | 'complexQuery' 
  | 'authentication' 
  | 'permissionCheck' 
  | 'tenantIsolation' 
  | 'auditWrite'
  | 'connectionPoolAcquire'
  | 'errorRecovery'
  | 'circuitBreakerResponse'
  | 'metricsCollection'
  | 'alertEvaluation';

export class PerformanceMeasurement {
  private static instance: PerformanceMeasurement;
  
  // Performance targets from PERFORMANCE_STANDARDS.md
  private readonly targets: Record<OperationType, number> = {
    simpleQuery: 10, // ms
    complexQuery: 50, // ms
    authentication: 200, // ms
    permissionCheck: 15, // ms
    tenantIsolation: 20, // ms
    auditWrite: 5, // ms
    connectionPoolAcquire: 100, // ms
    errorRecovery: 50, // ms
    circuitBreakerResponse: 5, // ms
    metricsCollection: 30, // ms
    alertEvaluation: 25 // ms
  };

  static getInstance(): PerformanceMeasurement {
    if (!PerformanceMeasurement.instance) {
      PerformanceMeasurement.instance = new PerformanceMeasurement();
    }
    return PerformanceMeasurement.instance;
  }

  async measureOperation<T>(
    operationType: OperationType,
    operation: () => Promise<T>
  ): Promise<PerformanceResult<T>> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      const target = this.targets[operationType];
      
      return {
        success: true,
        data: result,
        duration,
        validation: {
          passed: duration <= target,
          target,
          actual: duration,
          recommendations: duration > target ? this.getRecommendations(operationType, duration, target) : undefined
        }
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const target = this.targets[operationType];
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        validation: {
          passed: false,
          target,
          actual: duration
        }
      };
    }
  }

  private getRecommendations(operation: OperationType, actual: number, target: number): string[] {
    const ratio = actual / target;
    const recommendations = [];

    if (ratio > 5) {
      recommendations.push(`Performance severely degraded (${ratio.toFixed(1)}x slower than target)`);
    } else if (ratio > 2) {
      recommendations.push(`Performance significantly degraded (${ratio.toFixed(1)}x slower than target)`);
    }

    switch (operation) {
      case 'simpleQuery':
      case 'complexQuery':
        recommendations.push('Consider adding database indexes', 'Check query complexity');
        break;
      case 'authentication':
        recommendations.push('Check network latency', 'Consider authentication caching');
        break;
      case 'permissionCheck':
        recommendations.push('Verify permission cache is working', 'Check permission query optimization');
        break;
      case 'connectionPoolAcquire':
        recommendations.push('Check connection pool size', 'Monitor connection pool health');
        break;
      case 'errorRecovery':
        recommendations.push('Review retry configuration', 'Check circuit breaker settings');
        break;
      case 'circuitBreakerResponse':
        recommendations.push('Circuit breaker may be degraded', 'Check failure threshold settings');
        break;
      case 'metricsCollection':
        recommendations.push('Optimize metrics gathering', 'Consider metric sampling');
        break;
      case 'alertEvaluation':
        recommendations.push('Simplify alert rules', 'Optimize alert evaluation logic');
        break;
    }

    return recommendations;
  }
}
