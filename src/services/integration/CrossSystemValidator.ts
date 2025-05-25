
import { phase1Monitor } from '../performance/Phase1Monitor';
import { detailedMetricsCollector } from '../performance/DetailedMetricsCollector';
import { securityHeadersService } from '../security/SecurityHeadersService';
import { realDataCollector } from '../performance/RealDataCollector';

export interface ValidationResult {
  system: string;
  passed: boolean;
  issues: string[];
  metrics?: Record<string, any>;
}

export interface CrossSystemValidationReport {
  overall: {
    systemsValidated: number;
    systemsPassed: number;
    criticalIssues: number;
    timestamp: string;
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

    const results: ValidationResult[] = [
      await this.validatePerformanceSystem(),
      await this.validateSecuritySystem(),
      await this.validateDataCollectionSystem(),
      await this.validateSystemIntegration()
    ];

    const integrationMatrix = await this.buildIntegrationMatrix();
    const recommendations = this.generateRecommendations(results);

    const report: CrossSystemValidationReport = {
      overall: {
        systemsValidated: results.length,
        systemsPassed: results.filter(r => r.passed).length,
        criticalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
        timestamp: new Date().toISOString()
      },
      results,
      integrationMatrix,
      recommendations
    };

    console.log('✅ Cross-system validation completed', report.overall);
    return report;
  }

  private async validatePerformanceSystem(): Promise<ValidationResult> {
    const issues: string[] = [];
    let metrics: Record<string, any> = {};

    try {
      // Test Phase1Monitor integration
      const phase1Metrics = phase1Monitor.getMetrics();
      metrics.phase1 = phase1Metrics;

      if (phase1Metrics.database.totalQueries === 0) {
        issues.push('Phase1Monitor: No database queries recorded');
      }

      if (phase1Metrics.permissions.totalChecks === 0) {
        issues.push('Phase1Monitor: No permission checks recorded');
      }

      // Test DetailedMetricsCollector integration
      const detailedMetrics = detailedMetricsCollector.getLatestMetrics();
      if (!detailedMetrics) {
        issues.push('DetailedMetricsCollector: No metrics available');
      } else {
        metrics.detailed = {
          systemMemory: detailedMetrics.system.memoryUsage,
          databaseQueries: detailedMetrics.database.totalQueries,
          securityLatency: detailedMetrics.security.authenticationLatency
        };

        if (detailedMetrics.system.memoryUsage > 90) {
          issues.push('Performance: High memory usage detected');
        }

        if (detailedMetrics.database.averageQueryTime > 100) {
          issues.push('Performance: Slow database queries detected');
        }
      }

    } catch (error) {
      issues.push(`Performance system error: ${error.message}`);
    }

    return {
      system: 'Performance Monitoring',
      passed: issues.length === 0,
      issues,
      metrics
    };
  }

  private async validateSecuritySystem(): Promise<ValidationResult> {
    const issues: string[] = [];
    let metrics: Record<string, any> = {};

    try {
      // Test SecurityHeadersService integration
      const securityHeaders = securityHeadersService.getSecurityHeaders();
      const compliance = securityHeadersService.checkSecurityCompliance();
      
      metrics.security = {
        headersCount: Object.keys(securityHeaders).length,
        httpsEnabled: compliance.httpsEnabled,
        headersApplied: compliance.headersApplied,
        recommendations: compliance.recommendations.length
      };

      if (!compliance.httpsEnabled && window.location.hostname !== 'localhost') {
        issues.push('Security: HTTPS not enabled in production environment');
      }

      if (!compliance.headersApplied) {
        issues.push('Security: Security headers not properly applied');
      }

      if (compliance.recommendations.length > 0) {
        issues.push(`Security: ${compliance.recommendations.length} security recommendations pending`);
      }

      // Validate CSP effectiveness
      if (!securityHeaders['Content-Security-Policy']?.includes('script-src')) {
        issues.push('Security: Content Security Policy missing script-src directive');
      }

    } catch (error) {
      issues.push(`Security system error: ${error.message}`);
    }

    return {
      system: 'Security Infrastructure',
      passed: issues.length === 0,
      issues,
      metrics
    };
  }

  private async validateDataCollectionSystem(): Promise<ValidationResult> {
    const issues: string[] = [];
    let metrics: Record<string, any> = {};

    try {
      // Test RealDataCollector integration
      const cls = realDataCollector.getCumulativeLayoutShift();
      const longTaskDuration = realDataCollector.getLongTaskDuration();
      const networkInfo = realDataCollector.getNetworkInformation();
      const memoryInfo = realDataCollector.getMemoryInfo();

      metrics.realData = {
        cumulativeLayoutShift: cls,
        longTaskDuration,
        hasNetworkInfo: !!networkInfo,
        hasMemoryInfo: !!memoryInfo
      };

      if (cls > 0.1) {
        issues.push('UX: High Cumulative Layout Shift detected');
      }

      if (longTaskDuration > 50) {
        issues.push('Performance: Long tasks detected affecting responsiveness');
      }

      if (!networkInfo) {
        issues.push('Data Collection: Network information not available');
      }

      if (!memoryInfo) {
        issues.push('Data Collection: Memory information not available');
      }

    } catch (error) {
      issues.push(`Data collection system error: ${error.message}`);
    }

    return {
      system: 'Data Collection',
      passed: issues.length === 0,
      issues,
      metrics
    };
  }

  private async validateSystemIntegration(): Promise<ValidationResult> {
    const issues: string[] = [];
    let metrics: Record<string, any> = {};

    try {
      // Test cross-system data flow
      const phase1Metrics = phase1Monitor.getMetrics();
      const detailedMetrics = detailedMetricsCollector.getLatestMetrics();

      metrics.integration = {
        dataConsistency: this.checkDataConsistency(phase1Metrics, detailedMetrics),
        systemSynchronization: this.checkSystemSynchronization()
      };

      // Validate data consistency between systems
      if (detailedMetrics && Math.abs(phase1Metrics.database.totalQueries - detailedMetrics.database.totalQueries) > 10) {
        issues.push('Integration: Database query count inconsistency between monitoring systems');
      }

      // Check system responsiveness
      const responseTime = await this.measureSystemResponseTime();
      metrics.integration.systemResponseTime = responseTime;

      if (responseTime > 1000) {
        issues.push('Integration: System response time exceeds acceptable threshold');
      }

    } catch (error) {
      issues.push(`System integration error: ${error.message}`);
    }

    return {
      system: 'System Integration',
      passed: issues.length === 0,
      issues,
      metrics
    };
  }

  private async buildIntegrationMatrix(): Promise<Record<string, Record<string, boolean>>> {
    return {
      'Performance': {
        'Security': this.testPerformanceSecurityIntegration(),
        'DataCollection': this.testPerformanceDataIntegration(),
        'Monitoring': this.testPerformanceMonitoringIntegration()
      },
      'Security': {
        'Performance': this.testSecurityPerformanceIntegration(),
        'DataCollection': this.testSecurityDataIntegration(),
        'Headers': this.testSecurityHeadersIntegration()
      },
      'DataCollection': {
        'Performance': this.testDataPerformanceIntegration(),
        'Security': this.testDataSecurityIntegration(),
        'RealTime': this.testDataRealtimeIntegration()
      }
    };
  }

  private checkDataConsistency(phase1: any, detailed: any): boolean {
    if (!detailed) return false;
    
    // Check if key metrics are within reasonable ranges
    const queryDiff = Math.abs(phase1.database.totalQueries - detailed.database.totalQueries);
    const permissionDiff = Math.abs(phase1.permissions.totalChecks - detailed.security.permissionCheckLatency);
    
    return queryDiff < 10 && permissionDiff < 100;
  }

  private checkSystemSynchronization(): boolean {
    try {
      const now = Date.now();
      const phase1LastUpdate = phase1Monitor.getMetrics().timestamp || now;
      const timeDiff = Math.abs(now - phase1LastUpdate);
      
      return timeDiff < 60000; // Less than 1 minute old
    } catch {
      return false;
    }
  }

  private async measureSystemResponseTime(): Promise<number> {
    const start = performance.now();
    
    try {
      // Simulate system operations
      phase1Monitor.getMetrics();
      detailedMetricsCollector.getLatestMetrics();
      securityHeadersService.checkSecurityCompliance();
    } catch (error) {
      console.warn('Error measuring system response time:', error);
    }
    
    return performance.now() - start;
  }

  // Integration test methods
  private testPerformanceSecurityIntegration(): boolean {
    try {
      const metrics = detailedMetricsCollector.getLatestMetrics();
      const compliance = securityHeadersService.checkSecurityCompliance();
      return !!(metrics?.security && compliance);
    } catch { return false; }
  }

  private testPerformanceDataIntegration(): boolean {
    try {
      const cls = realDataCollector.getCumulativeLayoutShift();
      const metrics = detailedMetricsCollector.getLatestMetrics();
      return typeof cls === 'number' && !!metrics?.user;
    } catch { return false; }
  }

  private testPerformanceMonitoringIntegration(): boolean {
    try {
      const phase1 = phase1Monitor.getMetrics();
      const detailed = detailedMetricsCollector.getLatestMetrics();
      return !!(phase1 && detailed);
    } catch { return false; }
  }

  private testSecurityPerformanceIntegration(): boolean {
    try {
      const headers = securityHeadersService.getSecurityHeaders();
      const metrics = detailedMetricsCollector.getLatestMetrics();
      return !!(headers && metrics?.security);
    } catch { return false; }
  }

  private testSecurityDataIntegration(): boolean {
    try {
      const compliance = securityHeadersService.checkSecurityCompliance();
      const networkInfo = realDataCollector.getNetworkInformation();
      return !!(compliance && networkInfo);
    } catch { return false; }
  }

  private testSecurityHeadersIntegration(): boolean {
    try {
      securityHeadersService.applySecurityHeaders();
      const compliance = securityHeadersService.checkSecurityCompliance();
      return compliance.headersApplied;
    } catch { return false; }
  }

  private testDataPerformanceIntegration(): boolean {
    try {
      const memoryInfo = realDataCollector.getMemoryInfo();
      const metrics = detailedMetricsCollector.getLatestMetrics();
      return !!(memoryInfo && metrics?.memory);
    } catch { return false; }
  }

  private testDataSecurityIntegration(): boolean {
    try {
      const networkInfo = realDataCollector.getNetworkInformation();
      const compliance = securityHeadersService.checkSecurityCompliance();
      return !!(networkInfo && compliance);
    } catch { return false; }
  }

  private testDataRealtimeIntegration(): boolean {
    try {
      const cls = realDataCollector.getCumulativeLayoutShift();
      const longTask = realDataCollector.getLongTaskDuration();
      return typeof cls === 'number' && typeof longTask === 'number';
    } catch { return false; }
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    results.forEach(result => {
      if (!result.passed) {
        recommendations.push(`Fix ${result.system}: ${result.issues.length} issues detected`);
      }
    });

    // Performance recommendations
    const perfResult = results.find(r => r.system === 'Performance Monitoring');
    if (perfResult?.metrics?.detailed?.systemMemory > 80) {
      recommendations.push('Optimize memory usage - consider implementing garbage collection strategies');
    }

    // Security recommendations
    const secResult = results.find(r => r.system === 'Security Infrastructure');
    if (secResult?.metrics?.security?.recommendations > 0) {
      recommendations.push('Address pending security recommendations for enhanced protection');
    }

    // Integration recommendations
    const intResult = results.find(r => r.system === 'System Integration');
    if (intResult && !intResult.passed) {
      recommendations.push('Improve cross-system synchronization for better data consistency');
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems are functioning optimally - continue monitoring');
    }

    return recommendations;
  }

  async runContinuousValidation(intervalMs: number = 300000): Promise<void> {
    console.log(`🔄 Starting continuous cross-system validation (every ${intervalMs/1000}s)`);
    
    setInterval(async () => {
      try {
        const report = await this.validateAllSystems();
        
        if (report.overall.criticalIssues > 0) {
          console.warn('⚠️ Cross-system validation detected issues:', report.overall);
        } else {
          console.log('✅ Cross-system validation passed:', report.overall);
        }
      } catch (error) {
        console.error('❌ Cross-system validation failed:', error);
      }
    }, intervalMs);
  }
}

export const crossSystemValidator = CrossSystemValidator.getInstance();
export type { CrossSystemValidationReport, ValidationResult };
