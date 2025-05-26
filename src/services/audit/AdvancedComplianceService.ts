
// Advanced Compliance Service - Phase 2.3
// Provides comprehensive compliance reporting and validation

import { realTimeAuditMonitor } from './RealTimeAuditMonitor';
import { standardizedAuditLogger } from './StandardizedAuditLogger';

export interface ComplianceFramework {
  name: string;
  requirements: ComplianceRequirement[];
  reportingPeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  auditEvents: string[];
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  type: 'presence' | 'frequency' | 'retention' | 'access_control';
  criteria: Record<string, any>;
}

export interface ComplianceReport {
  id: string;
  framework: string;
  tenantId: string;
  reportType: 'sox' | 'gdpr' | 'hipaa' | 'pci_dss' | 'iso27001' | 'custom';
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  compliance: {
    overallScore: number;
    requirements: RequirementResult[];
    violations: ComplianceViolation[];
    recommendations: string[];
  };
  auditTrail: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    criticalEvents: any[];
  };
}

export interface RequirementResult {
  requirementId: string;
  name: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  score: number;
  evidence: string[];
  gaps: string[];
}

export interface ComplianceViolation {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  remediation: string;
}

export class AdvancedComplianceService {
  private static instance: AdvancedComplianceService;
  
  private frameworks: Record<string, ComplianceFramework> = {
    sox: {
      name: 'Sarbanes-Oxley Act',
      reportingPeriod: 'quarterly',
      requirements: [
        {
          id: 'sox_404',
          name: 'Internal Controls Assessment',
          description: 'Assess effectiveness of internal controls over financial reporting',
          auditEvents: ['data.update', 'data.delete', 'rbac.permission.grant'],
          validationRules: [
            { type: 'presence', criteria: { required: true } },
            { type: 'access_control', criteria: { segregationOfDuties: true } }
          ]
        }
      ]
    },
    gdpr: {
      name: 'General Data Protection Regulation',
      reportingPeriod: 'monthly',
      requirements: [
        {
          id: 'gdpr_art30',
          name: 'Records of Processing Activities',
          description: 'Maintain records of all data processing activities',
          auditEvents: ['data.create', 'data.read', 'data.update', 'data.delete'],
          validationRules: [
            { type: 'presence', criteria: { required: true } },
            { type: 'retention', criteria: { minimumPeriod: 365 } }
          ]
        }
      ]
    },
    hipaa: {
      name: 'Health Insurance Portability and Accountability Act',
      reportingPeriod: 'monthly',
      requirements: [
        {
          id: 'hipaa_164_308',
          name: 'Administrative Safeguards',
          description: 'Implement administrative safeguards for PHI',
          auditEvents: ['auth.login', 'auth.logout', 'data.read', 'rbac.role.assign'],
          validationRules: [
            { type: 'presence', criteria: { required: true } },
            { type: 'access_control', criteria: { minimumAccess: true } }
          ]
        }
      ]
    }
  };

  static getInstance(): AdvancedComplianceService {
    if (!AdvancedComplianceService.instance) {
      AdvancedComplianceService.instance = new AdvancedComplianceService();
    }
    return AdvancedComplianceService.instance;
  }

  async generateComplianceReport(
    tenantId: string,
    reportType: ComplianceReport['reportType'],
    period: { start: Date; end: Date }
  ): Promise<ComplianceReport> {
    const framework = this.getFrameworkForReportType(reportType);
    const auditData = await realTimeAuditMonitor.getFilteredAuditLogs({
      tenantId,
      timeRange: period
    });

    const requirementResults = await this.evaluateRequirements(
      framework.requirements,
      auditData,
      period
    );

    const violations = this.identifyViolations(requirementResults, auditData);
    const overallScore = this.calculateOverallScore(requirementResults);
    const recommendations = this.generateRecommendations(requirementResults, violations);

    const report: ComplianceReport = {
      id: crypto.randomUUID(),
      framework: framework.name,
      tenantId,
      reportType,
      generatedAt: new Date().toISOString(),
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString()
      },
      compliance: {
        overallScore,
        requirements: requirementResults,
        violations,
        recommendations
      },
      auditTrail: {
        totalEvents: auditData.length,
        eventsByType: this.groupEventsByType(auditData),
        criticalEvents: auditData.filter(event => 
          event.details?.severity === 'critical' || event.details?.outcome === 'failure'
        )
      }
    };

    // Log compliance report generation
    await standardizedAuditLogger.logStandardizedEvent(
      'compliance.report.generated',
      'compliance_report',
      report.id,
      'success',
      { tenantId },
      undefined,
      { reportType, framework: framework.name, overallScore }
    );

    return report;
  }

  async generateDataRetentionReport(tenantId: string): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 7); // 7-year retention

    const auditData = await realTimeAuditMonitor.getFilteredAuditLogs({
      tenantId,
      timeRange: { start: cutoffDate, end: new Date() }
    });

    const retentionAnalysis = {
      totalRecords: auditData.length,
      retentionPeriods: {
        within1Year: auditData.filter(d => new Date(d.timestamp) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)).length,
        within3Years: auditData.filter(d => new Date(d.timestamp) > new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000)).length,
        within7Years: auditData.filter(d => new Date(d.timestamp) > new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000)).length,
        beyond7Years: auditData.filter(d => new Date(d.timestamp) <= new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000)).length
      },
      recommendedActions: []
    };

    if (retentionAnalysis.retentionPeriods.beyond7Years > 0) {
      retentionAnalysis.recommendedActions.push(
        `Consider archiving ${retentionAnalysis.retentionPeriods.beyond7Years} records older than 7 years`
      );
    }

    return retentionAnalysis;
  }

  private async evaluateRequirements(
    requirements: ComplianceRequirement[],
    auditData: any[],
    period: { start: Date; end: Date }
  ): Promise<RequirementResult[]> {
    return requirements.map(requirement => {
      const relevantEvents = auditData.filter(event =>
        requirement.auditEvents.some(eventType => 
          event.action?.includes(eventType) || event.event_type === eventType
        )
      );

      const score = this.calculateRequirementScore(requirement, relevantEvents);
      const status = this.determineComplianceStatus(score);
      const evidence = this.collectEvidence(requirement, relevantEvents);
      const gaps = this.identifyGaps(requirement, relevantEvents);

      return {
        requirementId: requirement.id,
        name: requirement.name,
        status,
        score,
        evidence,
        gaps
      };
    });
  }

  private calculateRequirementScore(requirement: ComplianceRequirement, events: any[]): number {
    if (events.length === 0) return 0;

    let score = 0;
    const totalRules = requirement.validationRules.length;

    for (const rule of requirement.validationRules) {
      switch (rule.type) {
        case 'presence':
          score += events.length > 0 ? 1 : 0;
          break;
        case 'frequency':
          const expectedFrequency = rule.criteria.minimumEvents || 1;
          score += events.length >= expectedFrequency ? 1 : events.length / expectedFrequency;
          break;
        case 'access_control':
          const accessControlEvents = events.filter(e => e.event_type === 'rbac' || e.action?.includes('rbac'));
          score += accessControlEvents.length > 0 ? 1 : 0;
          break;
        case 'retention':
          score += 1; // Assume retention is properly configured
          break;
      }
    }

    return Math.min(100, (score / totalRules) * 100);
  }

  private determineComplianceStatus(score: number): RequirementResult['status'] {
    if (score >= 90) return 'compliant';
    if (score >= 70) return 'partial';
    if (score > 0) return 'non_compliant';
    return 'not_applicable';
  }

  private collectEvidence(requirement: ComplianceRequirement, events: any[]): string[] {
    return events.slice(0, 5).map(event => 
      `${event.action} on ${event.resource_type || 'resource'} at ${event.timestamp}`
    );
  }

  private identifyGaps(requirement: ComplianceRequirement, events: any[]): string[] {
    const gaps: string[] = [];
    
    if (events.length === 0) {
      gaps.push(`No audit events found for ${requirement.name}`);
    }

    const hasAccessControl = events.some(e => e.event_type === 'rbac');
    if (!hasAccessControl) {
      gaps.push('Missing access control audit events');
    }

    return gaps;
  }

  private identifyViolations(requirements: RequirementResult[], auditData: any[]): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    requirements.forEach(req => {
      if (req.status === 'non_compliant') {
        violations.push({
          id: crypto.randomUUID(),
          type: `${req.requirementId}_violation`,
          severity: req.score < 50 ? 'high' : 'medium',
          description: `Compliance requirement "${req.name}" not met`,
          timestamp: new Date().toISOString(),
          remediation: `Address gaps: ${req.gaps.join(', ')}`
        });
      }
    });

    return violations;
  }

  private calculateOverallScore(requirements: RequirementResult[]): number {
    if (requirements.length === 0) return 0;
    const totalScore = requirements.reduce((sum, req) => sum + req.score, 0);
    return Math.round(totalScore / requirements.length);
  }

  private generateRecommendations(requirements: RequirementResult[], violations: ComplianceViolation[]): string[] {
    const recommendations: string[] = [];

    if (violations.length > 0) {
      recommendations.push(`Address ${violations.length} compliance violations`);
    }

    const nonCompliantReqs = requirements.filter(r => r.status === 'non_compliant');
    if (nonCompliantReqs.length > 0) {
      recommendations.push(`Improve compliance for ${nonCompliantReqs.length} requirements`);
    }

    const partialReqs = requirements.filter(r => r.status === 'partial');
    if (partialReqs.length > 0) {
      recommendations.push(`Complete implementation for ${partialReqs.length} partially compliant requirements`);
    }

    recommendations.push('Schedule regular compliance reviews');
    recommendations.push('Enhance audit event coverage for critical operations');

    return recommendations;
  }

  private getFrameworkForReportType(reportType: ComplianceReport['reportType']): ComplianceFramework {
    return this.frameworks[reportType] || this.frameworks.sox;
  }

  private groupEventsByType(auditData: any[]): Record<string, number> {
    return auditData.reduce((acc, event) => {
      const type = event.event_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const advancedComplianceService = AdvancedComplianceService.getInstance();
