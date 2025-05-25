
/**
 * Cross-System Integration Validator
 * 
 * This service validates the integration points between different system components
 * including Security-RBAC, Multi-Tenant-Security, Database-Performance, and Audit-Logging.
 * 
 * Key responsibilities:
 * - Validate system integration health
 * - Monitor performance metrics across components
 * - Generate recommendations for optimization
 * - Provide comprehensive system health assessment
 */

import { phase1Monitor } from '../performance/Phase1Monitor';

export interface CrossSystemValidationResult {
  integrationPoint: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  metrics?: Record<string, any>;
  recommendations?: string[];
}

export interface CrossSystemValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  results: CrossSystemValidationResult[];
}

/**
 * CrossSystemIntegrationValidator
 * 
 * Singleton service that performs comprehensive validation of system integration points.
 * Uses the Phase1Monitor to gather real-time metrics and assess system health.
 */
export class CrossSystemIntegrationValidator {
  private static instance: CrossSystemIntegrationValidator;

  /**
   * Get singleton instance of the validator
   * Ensures only one validator instance exists across the application
   */
  static getInstance(): CrossSystemIntegrationValidator {
    if (!CrossSystemIntegrationValidator.instance) {
      CrossSystemIntegrationValidator.instance = new CrossSystemIntegrationValidator();
    }
    return CrossSystemIntegrationValidator.instance;
  }

  /**
   * Validates Security-RBAC Integration
   * 
   * Checks:
   * - Permission check performance (target: <15ms)
   * - Cache efficiency (target: >85% hit rate)
   * 
   * @returns ValidationResult with status and recommendations
   */
  async validateSecurityRBACIntegration(): Promise<CrossSystemValidationResult> {
    try {
      // Gather current performance metrics from Phase1Monitor
      const metrics = phase1Monitor.getMetrics();
      const permissionMetrics = metrics.permissions;
      
      // Validate permission check performance against enterprise standards
      // Target: <15ms average check time for optimal user experience
      const performanceOk = permissionMetrics.averageCheckTime < 15;
      
      // Validate cache efficiency against performance standards
      // Target: >85% hit rate to minimize database load
      const cacheEfficient = permissionMetrics.cacheHitRate > 85;
      
      if (performanceOk && cacheEfficient) {
        return {
          integrationPoint: 'Security-RBAC',
          status: 'passed',
          message: 'Security and RBAC integration is performing optimally',
          metrics: {
            averageCheckTime: permissionMetrics.averageCheckTime,
            cacheHitRate: permissionMetrics.cacheHitRate
          }
        };
      } else {
        // Generate specific recommendations based on identified issues
        const recommendations = [];
        if (!performanceOk) {
          recommendations.push('Optimize permission check queries');
        }
        if (!cacheEfficient) {
          recommendations.push('Improve permission caching strategy');
        }
        
        return {
          integrationPoint: 'Security-RBAC',
          status: 'warning',
          message: 'Security-RBAC integration needs optimization',
          metrics: {
            averageCheckTime: permissionMetrics.averageCheckTime,
            cacheHitRate: permissionMetrics.cacheHitRate
          },
          recommendations
        };
      }
    } catch (error) {
      // Handle validation errors gracefully
      return {
        integrationPoint: 'Security-RBAC',
        status: 'failed',
        message: `Security-RBAC integration validation failed: ${error.message}`,
        recommendations: ['Check security and RBAC service connectivity']
      };
    }
  }

  /**
   * Validates Multi-Tenant Security Integration
   * 
   * Checks:
   * - Tenant isolation integrity (target: 0 violations)
   * - Tenant switching performance (target: <200ms)
   * 
   * @returns ValidationResult with security and performance assessment
   */
  async validateMultiTenantSecurityIntegration(): Promise<CrossSystemValidationResult> {
    try {
      const metrics = phase1Monitor.getMetrics();
      const tenantMetrics = metrics.multiTenant;
      
      // Critical security check: ensure no tenant isolation violations
      // Zero tolerance for isolation breaches in multi-tenant architecture
      const isolationSecure = tenantMetrics.isolationViolations === 0;
      
      // Performance check: tenant switching should be fast for user experience
      // Target: <200ms for seamless tenant transitions
      const switchingFast = tenantMetrics.averageSwitchTime < 200;
      
      if (isolationSecure && switchingFast) {
        return {
          integrationPoint: 'MultiTenant-Security',
          status: 'passed',
          message: 'Multi-tenant security integration is secure and performant',
          metrics: {
            isolationViolations: tenantMetrics.isolationViolations,
            averageSwitchTime: tenantMetrics.averageSwitchTime
          }
        };
      } else {
        const recommendations = [];
        if (!isolationSecure) {
          recommendations.push('Review tenant isolation policies');
        }
        if (!switchingFast) {
          recommendations.push('Optimize tenant context switching');
        }
        
        return {
          integrationPoint: 'MultiTenant-Security',
          status: isolationSecure ? 'warning' : 'failed', // Failed if security compromised
          message: 'Multi-tenant security integration needs attention',
          metrics: {
            isolationViolations: tenantMetrics.isolationViolations,
            averageSwitchTime: tenantMetrics.averageSwitchTime
          },
          recommendations
        };
      }
    } catch (error) {
      return {
        integrationPoint: 'MultiTenant-Security',
        status: 'failed',
        message: `Multi-tenant security integration validation failed: ${error.message}`,
        recommendations: ['Check multi-tenant and security service connectivity']
      };
    }
  }

  /**
   * Validates Database Performance Integration
   * 
   * Checks:
   * - Query performance (target: <50ms average)
   * - Connection pool health
   * 
   * @returns ValidationResult with database performance assessment
   */
  async validateDatabasePerformanceIntegration(): Promise<CrossSystemValidationResult> {
    try {
      const metrics = phase1Monitor.getMetrics();
      const dbMetrics = metrics.database;
      
      // Validate query performance against enterprise standards
      // Target: <50ms average query time for responsive application
      const queriesPerformant = dbMetrics.averageQueryTime < 50;
      
      // Check connection pool health for system stability
      const poolHealthy = dbMetrics.connectionPoolStatus === 'healthy';
      
      if (queriesPerformant && poolHealthy) {
        return {
          integrationPoint: 'Database-Performance',
          status: 'passed',
          message: 'Database performance integration is optimal',
          metrics: {
            averageQueryTime: dbMetrics.averageQueryTime,
            connectionPoolStatus: dbMetrics.connectionPoolStatus
          }
        };
      } else {
        const recommendations = [];
        if (!queriesPerformant) {
          recommendations.push('Optimize database queries and indexes');
        }
        if (!poolHealthy) {
          recommendations.push('Review database connection pool configuration');
        }
        
        return {
          integrationPoint: 'Database-Performance',
          status: 'warning',
          message: 'Database performance integration needs optimization',
          metrics: {
            averageQueryTime: dbMetrics.averageQueryTime,
            connectionPoolStatus: dbMetrics.connectionPoolStatus
          },
          recommendations
        };
      }
    } catch (error) {
      return {
        integrationPoint: 'Database-Performance',
        status: 'failed',
        message: `Database performance integration validation failed: ${error.message}`,
        recommendations: ['Check database connectivity and monitoring']
      };
    }
  }

  /**
   * Validates Audit Logging Integration
   * 
   * Checks:
   * - Audit logging performance (target: <10ms average)
   * - Event capture verification (events being logged)
   * 
   * @returns ValidationResult with audit system assessment
   */
  async validateAuditLoggingIntegration(): Promise<CrossSystemValidationResult> {
    try {
      const metrics = phase1Monitor.getMetrics();
      const auditMetrics = metrics.audit;
      
      // Validate audit logging performance to ensure minimal system impact
      // Target: <10ms average to avoid blocking main application flow
      const loggingEfficient = auditMetrics.averageLogTime < 10;
      
      // Verify audit events are being captured properly
      // Essential for compliance and security monitoring
      const eventsLogged = auditMetrics.eventsLogged > 0;
      
      if (loggingEfficient && eventsLogged) {
        return {
          integrationPoint: 'Audit-Logging',
          status: 'passed',
          message: 'Audit logging integration is working efficiently',
          metrics: {
            averageLogTime: auditMetrics.averageLogTime,
            eventsLogged: auditMetrics.eventsLogged
          }
        };
      } else {
        const recommendations = [];
        if (!loggingEfficient) {
          recommendations.push('Optimize audit logging pipeline');
        }
        if (!eventsLogged) {
          recommendations.push('Verify audit event generation is configured');
        }
        
        return {
          integrationPoint: 'Audit-Logging',
          status: eventsLogged ? 'warning' : 'failed', // Failed if no events logged
          message: 'Audit logging integration needs attention',
          metrics: {
            averageLogTime: auditMetrics.averageLogTime,
            eventsLogged: auditMetrics.eventsLogged
          },
          recommendations
        };
      }
    } catch (error) {
      return {
        integrationPoint: 'Audit-Logging',
        status: 'failed',
        message: `Audit logging integration validation failed: ${error.message}`,
        recommendations: ['Check audit logging service connectivity']
      };
    }
  }

  /**
   * Runs comprehensive validation across all integration points
   * 
   * Executes all validation checks in parallel for efficiency and
   * aggregates results into a comprehensive system health summary.
   * 
   * @returns Complete validation summary with overall system status
   */
  async runComprehensiveValidation(): Promise<CrossSystemValidationSummary> {
    // Execute all validations in parallel for better performance
    const validations = await Promise.all([
      this.validateSecurityRBACIntegration(),
      this.validateMultiTenantSecurityIntegration(),
      this.validateDatabasePerformanceIntegration(),
      this.validateAuditLoggingIntegration()
    ]);

    // Aggregate validation results for summary
    const passed = validations.filter(v => v.status === 'passed').length;
    const failed = validations.filter(v => v.status === 'failed').length;
    const warnings = validations.filter(v => v.status === 'warning').length;

    // Determine overall system health status
    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (failed > 0) {
      overallStatus = 'critical'; // Any failures indicate critical issues
    } else if (warnings > 0) {
      overallStatus = 'degraded'; // Warnings indicate performance concerns
    } else {
      overallStatus = 'healthy'; // All checks passed
    }

    return {
      totalChecks: validations.length,
      passed,
      failed,
      warnings,
      overallStatus,
      results: validations
    };
  }
}

// Export singleton instance for application-wide use
export const crossSystemValidator = CrossSystemIntegrationValidator.getInstance();
