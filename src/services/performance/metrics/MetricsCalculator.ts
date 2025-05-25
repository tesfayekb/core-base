
// Refactored Metrics Calculator - Main orchestrator
// Now delegates to focused utility classes

import { Phase1Metrics, HealthStatus } from './Phase1Metrics';
import { DetailedPerformanceMetrics } from './MetricsTypes';
import { MetricsCalculations } from './MetricsCalculations';
import { MetricsHealthAssessment } from './MetricsHealthAssessment';
import { MetricsCollectionService } from './MetricsCollectionService';

export class MetricsCalculator extends MetricsCollectionService {
  // Delegate calculation methods to focused utility class
  static calculateAverageQueryTime = MetricsCalculations.calculateAverageQueryTime;
  static calculateCacheHitRate = MetricsCalculations.calculateCacheHitRate;
  static calculateAverageTime = MetricsCalculations.calculateAverageTime;
  static calculateSystemScore = MetricsCalculations.calculateSystemScore;

  // Delegate health assessment methods
  static assessHealthStatus = MetricsHealthAssessment.assessHealthStatus;
  static generatePerformanceReport = MetricsHealthAssessment.generatePerformanceReport;
}
