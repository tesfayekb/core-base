
// Core metrics calculation utilities
// Extracted from MetricsCalculator.ts for better organization

export class MetricsCalculations {
  static calculateAverageQueryTime(currentAvg: number, newDuration: number, queryCount: number): number {
    return (currentAvg * (queryCount - 1) + newDuration) / queryCount;
  }

  static calculateCacheHitRate(currentRate: number, isHit: boolean, totalChecks: number): number {
    const hitValue = isHit ? 100 : 0;
    return (currentRate * (totalChecks - 1) + hitValue) / totalChecks;
  }

  static calculateAverageTime(currentAvg: number, newDuration: number, operationCount: number): number {
    return (currentAvg * (operationCount - 1) + newDuration) / operationCount;
  }

  static calculateSystemScore(metrics: any): number {
    const health = MetricsHealthAssessment.assessHealthStatus(metrics);
    return health.score;
  }
}

// Import the health assessment class
import { MetricsHealthAssessment } from './MetricsHealthAssessment';
