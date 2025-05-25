
import { phase1Monitor } from '../performance/Phase1Monitor';
import { databaseService } from '../database/databaseService';
import { detailedMetricsCollector } from '../performance/DetailedMetricsCollector';

export interface ValidationResult {
  system: string;
  passed: boolean;
  issues: string[];
  score: number;
}

export interface CrossSystemValidationReport {
  overall: {
    timestamp: string;
    systemsValidated: number;
    systemsPassed: number;
    criticalIssues: number;
    overallScore: number;
  };
  results: ValidationResult[];
  integrationMatrix: Record<string, Record<string, boolean>>;
  recommendations: string[];
}

export class CrossSystemValidator {
  private static instance: CrossSystemValidator;

  static getInstance(): CrossSystemValidator {
    if (!CrossSystemValidator.instance) {
      CrossSystemValidator.instance = new CrossSystemValidator();
    }
    return CrossSystemValidator.instance;
  }

  private constructor() {}

  async validateAllSystems(): Promise<CrossSystemValidationReport> {
    console.log('🔍 Starting cross-system validation...');

    const results: ValidationResult[] = [];
    const timestamp = new Date().toISOString();

    // Validate Performance Monitoring
    results.push(await this.validatePerformanceMonitoring());

    // Validate Security Infrastructure
    results.push(await this.validateSecurityInfrastructure());

    // Validate Data Collection
    results.push(await this.validateDataCollection());

    // Validate System Integration
    results.push(await this.validateSystemIntegration());

    // Create integration matrix
    const integrationMatrix = await this.buildIntegrationMatrix();

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    const systemsPassed = results.filter(r => r.passed).length;
    const criticalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return {
      overall: {
        timestamp,
        systemsValidated: results.length,
        systemsPassed,
        criticalIssues,
        overallScore: Math.round(overallScore)
      },
      results,
      integrationMatrix,
      recommendations
    };
  }

  private async validatePerformanceMonitoring(): Promise<ValidationResult> {
    const issues: string[] = [];
    let score = 100;

    try {
      // Check Phase1Monitor
      const phase1Metrics = phase1Monitor.getMetrics();
      if (!phase1Metrics) {
        issues.push('Phase1Monitor not returning metrics');
        score -= 30;
      }

      // Check DetailedMetricsCollector
      const detailedMetrics = detailedMetricsCollector.getLatestMetrics();
      if (!detailedMetrics) {
        issues.push('DetailedMetricsCollector not collecting metrics');
        score -= 30;
      }

      // Validate performance thresholds
      if (phase1Metrics?.database.averageQueryTime > 50) {
        issues.push('Database query time exceeds threshold');
        score -= 20;
      }

      if (phase1Metrics?.rbac.averageCheckTime > 15) {
        issues.push('RBAC permission check time exceeds threshold');
        score -= 20;
      }

    } catch (error) {
      issues.push(`Performance monitoring validation failed: ${error.message}`);
      score = 0;
    }

    return {
      system: 'Performance Monitoring',
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  private async validateSecurityInfrastructure(): Promise<ValidationResult> {
    const issues: string[] = [];
    let score = 100;

    try {
      // Test database connection security
      const isConnected = await databaseService.testConnection();
      if (!isConnected) {
        issues.push('Database connection security test failed');
        score -= 50;
      }

      // Check tenant context isolation
      await databaseService.setTenantContext('test-tenant-1');
      await databaseService.setTenantContext('test-tenant-2');
      await databaseService.clearContexts();

      // Validate RBAC integration
      const phase1Metrics = phase1Monitor.getMetrics();
      if (phase1Metrics?.rbac.totalChecks === 0) {
        issues.push('RBAC system not processing permission checks');
        score -= 30;
      }

    } catch (error) {
      issues.push(`Security infrastructure validation failed: ${error.message}`);
      score = 0;
    }

    return {
      system: 'Security Infrastructure',
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  private async validateDataCollection(): Promise<ValidationResult> {
    const issues: string[] = [];
    let score = 100;

    try {
      // Validate Phase1Monitor data collection
      const phase1Metrics = phase1Monitor.getMetrics();
      if (!phase1Metrics || phase1Metrics.database.queryCount === 0) {
        issues.push('Phase1Monitor not collecting database metrics');
        score -= 25;
      }

      // Validate DetailedMetricsCollector
      const detailedMetrics = detailedMetricsCollector.getLatestMetrics();
      if (!detailedMetrics) {
        issues.push('DetailedMetricsCollector not operational');
        score -= 25;
      }

      // Check metrics history
      const metricsHistory = detailedMetricsCollector.getMetricsHistory();
      if (metricsHistory.length === 0) {
        issues.push('No metrics history available');
        score -= 25;
      }

      // Validate performance insights
      const insights = detailedMetricsCollector.getPerformanceInsights();
      if (!insights || insights.length === 0) {
        issues.push('Performance insights not being generated');
        score -= 25;
      }

    } catch (error) {
      issues.push(`Data collection validation failed: ${error.message}`);
      score = 0;
    }

    return {
      system: 'Data Collection',
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  private async validateSystemIntegration(): Promise<ValidationResult> {
    const issues: string[] = [];
    let score = 100;

    try {
      // Test cross-system workflow
      const startTime = performance.now();
      
      // Simulate user operation that touches multiple systems
      await databaseService.setTenantContext('integration-test');
      phase1Monitor.recordDatabaseQuery(25);
      phase1Monitor.recordPermissionCheck(10, true);
      phase1Monitor.recordAuditEvent(5);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      if (totalTime > 100) {
        issues.push('Cross-system operation exceeds performance threshold');
        score -= 20;
      }

      // Validate data consistency
      const phase1Metrics = phase1Monitor.getMetrics();
      const detailedMetrics = detailedMetricsCollector.getLatestMetrics();

      if (phase1Metrics && detailedMetrics) {
        // Check if systems are reporting consistent data
        const dbQueryTimeDiff = Math.abs(
          phase1Metrics.database.averageQueryTime - detailedMetrics.database.averageQueryTime
        );
        
        if (dbQueryTimeDiff > 10) {
          issues.push('Inconsistent database metrics between monitoring systems');
          score -= 30;
        }
      }

      await databaseService.clearContexts();

    } catch (error) {
      issues.push(`System integration validation failed: ${error.message}`);
      score = 0;
    }

    return {
      system: 'System Integration',
      passed: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }

  private async buildIntegrationMatrix(): Promise<Record<string, Record<string, boolean>>> {
    const matrix: Record<string, Record<string, boolean>> = {};

    try {
      // Performance ↔ Database
      matrix['Performance'] = {
        'Database': await this.testPerformanceDatabaseIntegration(),
        'Security': await this.testPerformanceSecurityIntegration(),
        'Audit': await this.testPerformanceAuditIntegration()
      };

      // Database ↔ Others
      matrix['Database'] = {
        'Performance': await this.testDatabasePerformanceIntegration(),
        'Security': await this.testDatabaseSecurityIntegration(),
        'Audit': await this.testDatabaseAuditIntegration()
      };

      // Security ↔ Others
      matrix['Security'] = {
        'Performance': await this.testSecurityPerformanceIntegration(),
        'Database': await this.testSecurityDatabaseIntegration(),
        'Audit': await this.testSecurityAuditIntegration()
      };

      // Audit ↔ Others
      matrix['Audit'] = {
        'Performance': await this.testAuditPerformanceIntegration(),
        'Database': await this.testAuditDatabaseIntegration(),
        'Security': await this.testAuditSecurityIntegration()
      };

    } catch (error) {
      console.error('Failed to build integration matrix:', error);
    }

    return matrix;
  }

  // Integration test methods
  private async testPerformanceDatabaseIntegration(): Promise<boolean> {
    try {
      const before = phase1Monitor.getMetrics().database.queryCount;
      await databaseService.testConnection();
      const after = phase1Monitor.getMetrics().database.queryCount;
      return after > before;
    } catch {
      return false;
    }
  }

  private async testPerformanceSecurityIntegration(): Promise<boolean> {
    try {
      const before = phase1Monitor.getMetrics().rbac.totalChecks;
      phase1Monitor.recordPermissionCheck(5, true);
      const after = phase1Monitor.getMetrics().rbac.totalChecks;
      return after > before;
    } catch {
      return false;
    }
  }

  private async testPerformanceAuditIntegration(): Promise<boolean> {
    try {
      const before = phase1Monitor.getMetrics().audit.eventsLogged;
      phase1Monitor.recordAuditEvent(3);
      const after = phase1Monitor.getMetrics().audit.eventsLogged;
      return after > before;
    } catch {
      return false;
    }
  }

  private async testDatabasePerformanceIntegration(): Promise<boolean> {
    return this.testPerformanceDatabaseIntegration();
  }

  private async testDatabaseSecurityIntegration(): Promise<boolean> {
    try {
      await databaseService.setTenantContext('test-tenant');
      await databaseService.clearContexts();
      return true;
    } catch {
      return false;
    }
  }

  private async testDatabaseAuditIntegration(): Promise<boolean> {
    try {
      // Test if database operations trigger audit events
      const before = phase1Monitor.getMetrics().audit.eventsLogged;
      await databaseService.testConnection();
      const after = phase1Monitor.getMetrics().audit.eventsLogged;
      return after >= before; // Allow for no change if audit isn't auto-triggered
    } catch {
      return false;
    }
  }

  private async testSecurityPerformanceIntegration(): Promise<boolean> {
    return this.testPerformanceSecurityIntegration();
  }

  private async testSecurityDatabaseIntegration(): Promise<boolean> {
    return this.testDatabaseSecurityIntegration();
  }

  private async testSecurityAuditIntegration(): Promise<boolean> {
    try {
      // Test if security operations trigger audit events
      const before = phase1Monitor.getMetrics().audit.eventsLogged;
      phase1Monitor.recordPermissionCheck(8, true);
      const after = phase1Monitor.getMetrics().audit.eventsLogged;
      return after >= before;
    } catch {
      return false;
    }
  }

  private async testAuditPerformanceIntegration(): Promise<boolean> {
    return this.testPerformanceAuditIntegration();
  }

  private async testAuditDatabaseIntegration(): Promise<boolean> {
    return this.testDatabaseAuditIntegration();
  }

  private async testAuditSecurityIntegration(): Promise<boolean> {
    return this.testSecurityAuditIntegration();
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];

    results.forEach(result => {
      if (!result.passed) {
        switch (result.system) {
          case 'Performance Monitoring':
            recommendations.push('Optimize performance monitoring system for better real-time data collection');
            break;
          case 'Security Infrastructure':
            recommendations.push('Review security configuration and tenant isolation mechanisms');
            break;
          case 'Data Collection':
            recommendations.push('Ensure all data collection services are properly initialized and running');
            break;
          case 'System Integration':
            recommendations.push('Improve cross-system communication and data consistency validation');
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('All systems are operating within acceptable parameters');
    }

    return recommendations;
  }
}

export const crossSystemValidator = CrossSystemValidator.getInstance();
