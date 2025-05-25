
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

export class CrossSystemIntegrationValidator {
  private static instance: CrossSystemIntegrationValidator;

  static getInstance(): CrossSystemIntegrationValidator {
    if (!CrossSystemIntegrationValidator.instance) {
      CrossSystemIntegrationValidator.instance = new CrossSystemIntegrationValidator();
    }
    return CrossSystemIntegrationValidator.instance;
  }

  async validateSecurityRBACIntegration(): Promise<CrossSystemValidationResult> {
    try {
      const metrics = phase1Monitor.getMetrics();
      const permissionMetrics = metrics.permissions;
      
      // Validate permission check performance
      const performanceOk = permissionMetrics.averageCheckTime < 15;
      
      // Validate cache efficiency
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
      return {
        integrationPoint: 'Security-RBAC',
        status: 'failed',
        message: `Security-RBAC integration validation failed: ${error.message}`,
        recommendations: ['Check security and RBAC service connectivity']
      };
    }
  }

  async validateMultiTenantSecurityIntegration(): Promise<CrossSystemValidationResult> {
    try {
      const metrics = phase1Monitor.getMetrics();
      const tenantMetrics = metrics.multiTenant;
      
      // Validate no isolation violations
      const isolationSecure = tenantMetrics.isolationViolations === 0;
      
      // Validate tenant switching performance
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
          status: isolationSecure ? 'warning' : 'failed',
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

  async validateDatabasePerformanceIntegration(): Promise<CrossSystemValidationResult> {
    try {
      const metrics = phase1Monitor.getMetrics();
      const dbMetrics = metrics.database;
      
      // Validate query performance
      const queriesPerformant = dbMetrics.averageQueryTime < 50;
      
      // Validate connection pool health
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

  async validateAuditLoggingIntegration(): Promise<CrossSystemValidationResult> {
    try {
      const metrics = phase1Monitor.getMetrics();
      const auditMetrics = metrics.audit;
      
      // Validate audit logging performance
      const loggingEfficient = auditMetrics.averageLogTime < 10;
      
      // Validate audit events are being captured
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
          status: eventsLogged ? 'warning' : 'failed',
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

  async runComprehensiveValidation(): Promise<CrossSystemValidationSummary> {
    const validations = await Promise.all([
      this.validateSecurityRBACIntegration(),
      this.validateMultiTenantSecurityIntegration(),
      this.validateDatabasePerformanceIntegration(),
      this.validateAuditLoggingIntegration()
    ]);

    const passed = validations.filter(v => v.status === 'passed').length;
    const failed = validations.filter(v => v.status === 'failed').length;
    const warnings = validations.filter(v => v.status === 'warning').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (failed > 0) {
      overallStatus = 'critical';
    } else if (warnings > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
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

export const crossSystemValidator = CrossSystemIntegrationValidator.getInstance();
