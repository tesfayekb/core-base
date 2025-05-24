
// Phase 1.2 Validation Runner - Refactored
// Standalone runner for Phase 1.2 validation outside of Jest

import { phase1Monitor } from '../../services/performance/Phase1Monitor';
import { ValidationReport } from './validators/DatabaseValidator';
import { DatabaseValidator } from './validators/DatabaseValidator';
import { RBACValidator } from './validators/RBACValidator';
import { MultiTenantValidator } from './validators/MultiTenantValidator';
import { AuditValidator } from './validators/AuditValidator';
import { PerformanceValidator } from './validators/PerformanceValidator';
import { EndToEndValidator } from './validators/EndToEndValidator';
import { ReportGenerator } from './ReportGenerator';

export { ValidationReport };

export class Phase1ValidationRunner {
  private static instance: Phase1ValidationRunner;
  private validators: {
    database: DatabaseValidator;
    rbac: RBACValidator;
    multiTenant: MultiTenantValidator;
    audit: AuditValidator;
    performance: PerformanceValidator;
    endToEnd: EndToEndValidator;
  };
  private reportGenerator: ReportGenerator;
  
  private constructor() {
    this.validators = {
      database: new DatabaseValidator(),
      rbac: new RBACValidator(),
      multiTenant: new MultiTenantValidator(),
      audit: new AuditValidator(),
      performance: new PerformanceValidator(),
      endToEnd: new EndToEndValidator()
    };
    this.reportGenerator = new ReportGenerator();
  }

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

    // Run all validations
    report.componentScores.database = await this.validators.database.validate(report);
    report.componentScores.rbac = await this.validators.rbac.validate(report);
    report.componentScores.multiTenant = await this.validators.multiTenant.validate(report);
    report.componentScores.audit = await this.validators.audit.validate(report);
    report.componentScores.performance = await this.validators.performance.validate(report);
    report.componentScores.endToEnd = await this.validators.endToEnd.validate(report);

    // Calculate overall score
    const scores = Object.values(report.componentScores);
    report.overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

    // Determine readiness
    report.readyForNextPhase = report.overallScore >= 85;

    // Generate recommendations
    this.reportGenerator.generateRecommendations(report);

    console.log(`📊 Phase 1.2 Validation Complete - Score: ${report.overallScore}%`);
    return report;
  }

  generateReport(report: ValidationReport): string {
    return this.reportGenerator.generateReport(report);
  }
}

export const phase1ValidationRunner = Phase1ValidationRunner.getInstance();
