// Enhanced Performance Measurement with better caching and monitoring
import { PerformanceMeasurement, OperationType, PerformanceResult } from './PerformanceMeasurement';

export class OptimizedPerformanceMeasurement extends PerformanceMeasurement {
  private static optimizedInstance: OptimizedPerformanceMeasurement;
  private performanceHistory: Map<string, number[]> = new Map();
  private readonly HISTORY_SIZE = 100;

  static getInstance(): OptimizedPerformanceMeasurement {
    if (!OptimizedPerformanceMeasurement.optimizedInstance) {
      OptimizedPerformanceMeasurement.optimizedInstance = new OptimizedPerformanceMeasurement();
    }
    return OptimizedPerformanceMeasurement.optimizedInstance;
  }

  async measureOperation<T>(
    operationType: OperationType,
    operation: () => Promise<T>
  ): Promise<PerformanceResult<T>> {
    const result = await super.measureOperation(operationType, operation);
    
    // Track performance history for trend analysis
    this.recordPerformanceHistory(operationType, result.duration);
    
    // Enhanced validation with trend analysis
    const enhancedValidation = {
      ...result.validation,
      trend: this.getPerformanceTrend(operationType),
      percentile95: this.getPercentile(operationType, 95)
    };
    
    return {
      ...result,
      validation: enhancedValidation
    };
  }

  private recordPerformanceHistory(operation: OperationType, duration: number): void {
    const history = this.performanceHistory.get(operation) || [];
    history.push(duration);
    
    // Keep only recent measurements
    if (history.length > this.HISTORY_SIZE) {
      history.shift();
    }
    
    this.performanceHistory.set(operation, history);
  }

  private getPerformanceTrend(operation: OperationType): 'improving' | 'degrading' | 'stable' {
    const history = this.performanceHistory.get(operation);
    if (!history || history.length < 10) return 'stable';
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change < -0.1) return 'improving';
    if (change > 0.1) return 'degrading';
    return 'stable';
  }

  private getPercentile(operation: OperationType, percentile: number): number {
    const history = this.performanceHistory.get(operation);
    if (!history || history.length === 0) return 0;
    
    const sorted = [...history].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  getOperationStats(operation: OperationType): {
    average: number;
    min: number;
    max: number;
    percentile95: number;
    sampleCount: number;
  } {
    const history = this.performanceHistory.get(operation) || [];
    
    if (history.length === 0) {
      return { average: 0, min: 0, max: 0, percentile95: 0, sampleCount: 0 };
    }
    
    const sorted = [...history].sort((a, b) => a - b);
    
    return {
      average: history.reduce((a, b) => a + b, 0) / history.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentile95: this.getPercentile(operation, 95),
      sampleCount: history.length
    };
  }
}

export const optimizedPerformanceMeasurement = OptimizedPerformanceMeasurement.getInstance();
