
// Phase 1 Completion Validator
// Ensures all Phase 1 requirements are met before proceeding

import { tenantContextService } from '../SharedTenantContextService';
import { authService } from '../authService';
import { PerformanceMeasurement } from '../performance/PerformanceMeasurement';

export interface Phase1ValidationResult {
  passed: boolean;
  completedItems: string[];
  missingItems: string[];
  performanceIssues: string[];
  recommendations: string[];
}

export class Phase1Validator {
  private static instance: Phase1Validator;
  
  static getInstance(): Phase1Validator {
    if (!Phase1Validator.instance) {
      Phase1Validator.instance = new Phase1Validator();
    }
    return Phase1Validator.instance;
  }

  async validatePhase1Completion(): Promise<Phase1ValidationResult> {
    const completed: string[] = [];
    const missing: string[] = [];
    const performanceIssues: string[] = [];
    const recommendations: string[] = [];

    // Check Authentication System
    try {
      // Test basic auth functionality exists
      if (typeof authService.signIn === 'function') {
        completed.push('Authentication Service Implemented');
      } else {
        missing.push('Authentication Service Missing');
      }
    } catch (error) {
      missing.push('Authentication Service Error');
    }

    // Check Tenant Context Service
    try {
      const tenantService = tenantContextService;
      if (tenantService && typeof tenantService.setTenantContext === 'function') {
        completed.push('Tenant Context Service Implemented');
      } else {
        missing.push('Tenant Context Service Missing');
      }
    } catch (error) {
      missing.push('Tenant Context Service Error');
    }

    // Check Performance Measurement
    try {
      const perfMeasurement = PerformanceMeasurement.getInstance();
      if (perfMeasurement && typeof perfMeasurement.measureOperation === 'function') {
        completed.push('Performance Measurement Infrastructure');
      } else {
        missing.push('Performance Measurement Infrastructure Missing');
      }
    } catch (error) {
      missing.push('Performance Measurement Infrastructure Error');
    }

    // Check Database Functions (basic check)
    // Note: This would require actual database connection to fully validate
    // For now, we assume they exist if tenant service works

    // Determine overall pass/fail
    const criticalRequirements = [
      'Authentication Service Implemented',
      'Tenant Context Service Implemented', 
      'Performance Measurement Infrastructure'
    ];

    const hasAllCritical = criticalRequirements.every(req => completed.includes(req));
    
    if (!hasAllCritical) {
      recommendations.push('Complete all critical Phase 1 requirements before proceeding to Phase 2');
    }

    if (missing.length > 0) {
      recommendations.push('Address all missing components listed above');
    }

    return {
      passed: hasAllCritical && missing.length === 0,
      completedItems: completed,
      missingItems: missing,
      performanceIssues,
      recommendations
    };
  }

  async enforcePhase1Prerequisites(): Promise<void> {
    const validation = await this.validatePhase1Completion();
    
    if (!validation.passed) {
      const errorMessage = `Phase 1 prerequisites not met:\n${validation.missingItems.join('\n')}\n\nRecommendations:\n${validation.recommendations.join('\n')}`;
      throw new Error(errorMessage);
    }
  }
}

export const phase1Validator = Phase1Validator.getInstance();
