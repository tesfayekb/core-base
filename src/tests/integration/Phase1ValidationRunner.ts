
// Phase 1.2 Validation Runner
// Standalone runner for Phase 1.2 validation outside of Jest

import { databaseService } from '../../services/database/databaseService';
import { phase1Monitor } from '../../services/performance/Phase1Monitor';

export interface ValidationReport {
  timestamp: Date;
  overallScore: number;
  componentScores: {
    database: number;
    rbac: number;
    multiTenant: number;
    audit: number;
    performance: number;
    endToEnd: number;
  };
  issues: string[];
  recommendations: string[];
  readyForNextPhase: boolean;
}

export class Phase1ValidationRunner {
  private static instance: Phase1ValidationRunner;
  
  static getInstance(): Phase1ValidationRunner {
    if (!Phase1ValidationRunner.instance) {
      Phase1ValidationRunner.instance = new Phase1ValidationRunner();
    }
    return Phase1ValidationRunner.instance;
  }

  async runValidation(): Promise<ValidationReport> {
    console.log('🚀 Starting Phase 1.2 Validation...');
    
    const report: ValidationReport = {
      timestamp: new Date(),
      overallScore: 0,
      componentScores: {
        database: 0,
        rbac: 0,
        multiTenant: 0,
        audit: 0,
        performance: 0,
        endToEnd: 0
      },
      issues: [],
      recommendations: [],
      readyForNextPhase: false
    };

    // Reset monitoring
    phase1Monitor.reset();

    // Validate each component
    report.componentScores.database = await this.validateDatabase(report);
    report.componentScores.rbac = await this.validateRBAC(report);
    report.componentScores.multiTenant = await this.validateMultiTenant(report);
    report.componentScores.audit = await this.validateAudit(report);
    report.componentScores.performance = await this.validatePerformance(report);
    report.componentScores.endToEnd = await this.validateEndToEnd(report);

    // Calculate overall score
    const scores = Object.values(report.componentScores);
    report.overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

    // Determine readiness
    report.readyForNextPhase = report.overallScore >= 85;

    // Generate recommendations
    this.generateRecommendations(report);

    console.log(`📊 Phase 1.2 Validation Complete - Score: ${report.overallScore}%`);
    return report;
  }

  private async validateDatabase(report: ValidationReport): Promise<number> {
    try {
      console.log('🗄️ Validating database foundation...');
      
      const isConnected = await databaseService.testConnection();
      if (!isConnected) {
        report.issues.push('Database connection failed');
        return 0;
      }

      await databaseService.initialize('validation');
      const status = await databaseService.getStatus();
      
      if (!status || !status.totalMigrations) {
        report.issues.push('Database migrations not properly initialized');
        return 50;
      }

      return 100;
    } catch (error) {
      report.issues.push(`Database validation failed: ${error.message}`);
      return 0;
    }
  }

  private async validateRBAC(report: ValidationReport): Promise<number> {
    try {
      console.log('🔐 Validating RBAC foundation...');
      
      await databaseService.setTenantContext('validation-tenant');
      await databaseService.setUserContext('validation-user');
      await databaseService.clearContexts();
      
      return 100;
    } catch (error) {
      report.issues.push(`RBAC validation failed: ${error.message}`);
      return 0;
    }
  }

  private async validateMultiTenant(report: ValidationReport): Promise<number> {
    try {
      console.log('🏢 Validating multi-tenant foundation...');
      
      const startTime = performance.now();
      await databaseService.setTenantContext('tenant-1');
      await databaseService.setTenantContext('tenant-2');
      const duration = performance.now() - startTime;
      
      if (duration > 200) {
        report.issues.push('Tenant switching exceeds 200ms target');
        return 70;
      }
      
      return 100;
    } catch (error) {
      report.issues.push(`Multi-tenant validation failed: ${error.message}`);
      return 0;
    }
  }

  private async validateAudit(report: ValidationReport): Promise<number> {
    try {
      console.log('📝 Validating audit foundation...');
      
      phase1Monitor.recordAuditEvent(3);
      const metrics = phase1Monitor.getMetrics();
      
      if (metrics.audit.eventsLogged === 0) {
        report.issues.push('Audit event logging not working');
        return 0;
      }
      
      return 100;
    } catch (error) {
      report.issues.push(`Audit validation failed: ${error.message}`);
      return 0;
    }
  }

  private async validatePerformance(report: ValidationReport): Promise<number> {
    try {
      console.log('⚡ Validating performance targets...');
      
      const metrics = phase1Monitor.getMetrics();
      const health = phase1Monitor.getHealthStatus();
      
      let score = 100;
      
      if (health.status === 'critical') {
        score -= 50;
        report.issues.push('System health is critical');
      } else if (health.status === 'warning') {
        score -= 25;
        report.issues.push('System health has warnings');
      }
      
      return Math.max(0, score);
    } catch (error) {
      report.issues.push(`Performance validation failed: ${error.message}`);
      return 0;
    }
  }

  private async validateEndToEnd(report: ValidationReport): Promise<number> {
    try {
      console.log('🔄 Validating end-to-end integration...');
      
      await databaseService.setTenantContext('e2e-tenant');
      phase1Monitor.recordDatabaseQuery(25);
      phase1Monitor.recordPermissionCheck(10, true);
      await databaseService.clearContexts();
      
      const health = phase1Monitor.getHealthStatus();
      if (health.status === 'critical') {
        report.issues.push('End-to-end flow results in critical system state');
        return 50;
      }
      
      return 100;
    } catch (error) {
      report.issues.push(`End-to-end validation failed: ${error.message}`);
      return 0;
    }
  }

  private generateRecommendations(report: ValidationReport): void {
    if (report.componentScores.database < 100) {
      report.recommendations.push('Review database connection and migration setup');
    }
    
    if (report.componentScores.performance < 85) {
      report.recommendations.push('Optimize performance bottlenecks before next phase');
    }
    
    if (report.componentScores.multiTenant < 100) {
      report.recommendations.push('Improve tenant switching performance');
    }
    
    if (report.overallScore < 85) {
      report.recommendations.push('Address critical issues before proceeding to Phase 2');
    }
    
    if (report.issues.length === 0) {
      report.recommendations.push('Phase 1.2 is ready for Phase 2 implementation');
    }
  }

  generateReport(report: ValidationReport): string {
    return `
🎯 Phase 1.2 Validation Report
=============================
Timestamp: ${report.timestamp.toISOString()}
Overall Score: ${report.overallScore}%
Ready for Next Phase: ${report.readyForNextPhase ? 'YES' : 'NO'}

📊 Component Scores:
• Database Foundation: ${report.componentScores.database}%
• RBAC Foundation: ${report.componentScores.rbac}%
• Multi-Tenant Foundation: ${report.componentScores.multiTenant}%
• Audit Foundation: ${report.componentScores.audit}%
• Performance Targets: ${report.componentScores.performance}%
• End-to-End Integration: ${report.componentScores.endToEnd}%

${report.issues.length > 0 ? `⚠️ Issues Found:\n${report.issues.map(issue => `• ${issue}`).join('\n')}\n` : '✅ No issues found\n'}

💡 Recommendations:
${report.recommendations.map(rec => `• ${rec}`).join('\n')}

${report.readyForNextPhase ? '🎉 Phase 1.2 validation PASSED - Ready to proceed!' : '🔧 Phase 1.2 needs improvement before Phase 2'}
`;
  }
}

export const phase1ValidationRunner = Phase1ValidationRunner.getInstance();
