
import { phase1Monitor } from '../performance/Phase1Monitor';
import { detailedMetricsCollector } from '../performance/DetailedMetricsCollector';

export interface ValidationResult {
  system: string;
  passed: boolean;
  issues: string[];
  score: number;
}

export interface CrossSystemValidationReport {
  overall: {
    passed: boolean;
    score: number;
    timestamp: string;
    systemsValidated: number;
    systemsPassed: number;
    criticalIssues: number;
  };
  results: ValidationResult[];
  integrationMatrix: Record<string, Record<string, boolean>>;
  recommendations: string[];
}

// Define the metrics structure we actually receive from phase1Monitor
interface ActualMetrics {
  database: {
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    connectionPoolStatus: string;
  };
  permissions: {
    totalChecks: number;
    averageCheckTime: number;
    cacheHitRate: number;
  };
  multiTenant: {
    tenantSwitches: number;
    averageSwitchTime: number;
    isolationViolations: number;
  };
  audit: {
    eventsLogged: number;
    averageLogTime: number;
    batchOperations: number;
  };
}

export class CrossSystemValidator {
  private static instance: CrossSystemValidator;

  static getInstance(): CrossSystemValidator {
    if (!CrossSystemValidator.instance) {
      CrossSystemValidator.instance = new CrossSystemValidator();
    }
    return CrossSystemValidator.instance;
  }

  async validateAllSystems(): Promise<CrossSystemValidationReport> {
    const results: ValidationResult[] = [];
    const metrics = phase1Monitor.getMetrics() as ActualMetrics;

    // Validate Performance Monitoring
    results.push(await this.validatePerformanceMonitoring(metrics));

    // Validate Security Infrastructure  
    results.push(await this.validateSecurityInfrastructure(metrics));

    // Validate Data Collection
    results.push(await this.validateDataCollection(metrics));

    // Validate System Integration
    results.push(await this.validateSystemIntegration(metrics));

    // Generate integration matrix
    const integrationMatrix = this.generateIntegrationMatrix(results);

    // Calculate overall scores
    const systemsPassed = results.filter(r => r.passed).length;
    const overallScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
    const criticalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

    return {
      overall: {
        passed: systemsPassed === results.length,
        score: overallScore,
        timestamp: new Date().toISOString(),
        systemsValidated: results.length,
        systemsPassed,
        criticalIssues
      },
      results,
      integrationMatrix,
      recommendations: this.generateRecommendations(results)
    };
  }

  private async validatePerformanceMonitoring(metrics: ActualMetrics): Promise<ValidationResult> {
    const issues: string[] = [];
    let score = 100;

    // Check database performance
    if (metrics.database.averageQueryTime > 50) {
      issues.push('Database queries exceed 50ms target');
      score -= 20;
    }

    // Check permission system performance
    if (metrics.permissions.averageCheckTime > 15) {
      issues.push('Permission checks exceed 15ms target');
      score -= 20;
    }

    // Check connection pool status
    if (metrics.database.connectionPoolStatus !== 'healthy') {
      issues.push('Database connection pool is not healthy');
      score -= 15;
    }

    return {
      system: 'Performance Monitoring',
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  private async validateSecurityInfrastructure(metrics: ActualMetrics): Promise<ValidationResult> {
    const issues: string[] = [];
    let score = 100;

    // Check permission cache effectiveness
    if (metrics.permissions.cacheHitRate < 85) {
      issues.push('Permission cache hit rate below 85% target');
      score -= 15;
    }

    // Check multi-tenant isolation
    if (metrics.multiTenant.isolationViolations > 0) {
      issues.push('CRITICAL: Tenant isolation violations detected');
      score -= 50;
    }

    // Check tenant switching performance
    if (metrics.multiTenant.averageSwitchTime > 200) {
      issues.push('Tenant switching exceeds 200ms target');
      score -= 15;
    }

    return {
      system: 'Security Infrastructure',
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  private async validateDataCollection(metrics: ActualMetrics): Promise<ValidationResult> {
    const issues: string[] = [];
    let score = 100;

    // Check database query volume
    if (metrics.database.totalQueries === 0) {
      issues.push('No database queries recorded');
      score -= 30;
    }

    // Check audit logging
    if (metrics.audit.averageLogTime > 5) {
      issues.push('Audit logging exceeds 5ms target');
      score -= 15;
    }

    // Check permission system activity
    if (metrics.permissions.totalChecks === 0) {
      issues.push('No permission checks recorded');
      score -= 20;
    }

    return {
      system: 'Data Collection',
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  private async validateSystemIntegration(metrics: ActualMetrics): Promise<ValidationResult> {
    const issues: string[] = [];
    let score = 100;

    // Test cross-system data consistency
    const detailedMetrics = detailedMetricsCollector.getLatestMetrics();
    
    if (!detailedMetrics) {
      issues.push('Detailed metrics collection not active');
      score -= 25;
    }

    // Check system health integration
    const healthStatus = phase1Monitor.getHealthStatus();
    if (healthStatus.status === 'critical') {
      issues.push('System health monitoring reports critical status');
      score -= 40;
    }

    // Validate integration points are working
    try {
      // Test that all monitoring systems are collecting data
      if (metrics.database.totalQueries === 0 && metrics.permissions.totalChecks === 0) {
        issues.push('Multiple monitoring systems appear inactive');
        score -= 30;
      }
    } catch (error) {
      issues.push('Integration validation failed due to system errors');
      score -= 50;
    }

    return {
      system: 'System Integration',
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  private generateIntegrationMatrix(results: ValidationResult[]): Record<string, Record<string, boolean>> {
    const matrix: Record<string, Record<string, boolean>> = {};

    results.forEach(result => {
      matrix[result.system] = {};
      
      // Each system's integration with others based on validation results
      results.forEach(otherResult => {
        if (result.system !== otherResult.system) {
          // Integration is considered working if both systems pass validation
          matrix[result.system][otherResult.system] = result.passed && otherResult.passed;
        }
      });
    });

    return matrix;
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    const perfResult = results.find(r => r.system === 'Performance Monitoring');
    if (perfResult && !perfResult.passed) {
      recommendations.push('Optimize database queries and permission caching for better performance');
    }

    // Security recommendations
    const secResult = results.find(r => r.system === 'Security Infrastructure');
    if (secResult && !secResult.passed) {
      recommendations.push('Review security configurations and authentication mechanisms');
    }

    // Data collection recommendations
    const dataResult = results.find(r => r.system === 'Data Collection');
    if (dataResult && !dataResult.passed) {
      recommendations.push('Ensure all monitoring and audit systems are properly configured');
    }

    // Integration recommendations
    const intResult = results.find(r => r.system === 'System Integration');
    if (intResult && !intResult.passed) {
      recommendations.push('Verify cross-system communication and data consistency');
    }

    // Overall recommendations
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    if (overallScore < 85) {
      recommendations.push('System requires attention before production deployment');
    }

    return recommendations;
  }

  // Test specific integration points
  async validateCrossSystemData(): Promise<{ consistent: boolean; issues: string[] }> {
    const issues: string[] = [];
    const metrics = phase1Monitor.getMetrics() as ActualMetrics;

    // Check data consistency between systems
    try {
      // Validate metrics correlation
      if (metrics.database.totalQueries > 0 && metrics.permissions.totalChecks === 0) {
        issues.push('Database activity without permission checks suggests integration issue');
      }

      // Check system synchronization
      const health = phase1Monitor.getHealthStatus();
      if (health.issues.length > 0) {
        issues.push(`Health monitoring reports issues: ${health.issues.join(', ')}`);
      }

    } catch (error) {
      issues.push(`Cross-system validation error: ${error.message}`);
    }

    return {
      consistent: issues.length === 0,
      issues
    };
  }
}

export const crossSystemValidator = CrossSystemValidator.getInstance();
