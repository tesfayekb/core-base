
// Integration Health Monitor - System-Wide Health Checks
// Monitors the health of all security integrations

import { enhancedThreatDetectionService } from '../security/EnhancedThreatDetectionService';
import { enhancedErrorHandler } from '../error/EnhancedErrorHandler';
import { realTimeAuditMonitor } from '../audit/RealTimeAuditMonitor';
import { standardizedAuditLogger } from '../audit/StandardizedAuditLogger';

export interface SystemHealthCheck {
  system: string;
  healthy: boolean;
  score: number;
  issues: string[];
  lastChecked: string;
  performance: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
}

export interface IntegrationHealth {
  overall: {
    score: number;
    status: 'healthy' | 'degraded' | 'critical';
  };
  systems: Record<string, SystemHealthCheck>;
  integrationPoints: Array<{
    from: string;
    to: string;
    healthy: boolean;
    latency: number;
  }>;
}

export class IntegrationHealthMonitor {
  private static instance: IntegrationHealthMonitor;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute
  private cachedHealth: IntegrationHealth | null = null;

  static getInstance(): IntegrationHealthMonitor {
    if (!IntegrationHealthMonitor.instance) {
      IntegrationHealthMonitor.instance = new IntegrationHealthMonitor();
    }
    return IntegrationHealthMonitor.instance;
  }

  async getIntegrationHealth(): Promise<IntegrationHealth> {
    const now = Date.now();
    
    // Use cached health if recent
    if (this.cachedHealth && now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.cachedHealth;
    }

    try {
      const healthChecks = await Promise.allSettled([
        this.checkSecuritySystemHealth(),
        this.checkAuditSystemHealth(),
        this.checkRBACSystemHealth(),
        this.checkTenantSystemHealth()
      ]);

      const systems: Record<string, SystemHealthCheck> = {};
      let totalScore = 0;
      let systemCount = 0;

      healthChecks.forEach((result, index) => {
        const systemNames = ['security', 'audit', 'rbac', 'tenant'];
        const systemName = systemNames[index];
        
        if (result.status === 'fulfilled') {
          systems[systemName] = result.value;
          totalScore += result.value.score;
          systemCount++;
        } else {
          systems[systemName] = {
            system: systemName,
            healthy: false,
            score: 0,
            issues: ['Health check failed'],
            lastChecked: new Date().toISOString(),
            performance: { responseTime: 0, errorRate: 100, throughput: 0 }
          };
        }
      });

      const overallScore = systemCount > 0 ? Math.round(totalScore / systemCount) : 0;
      const integrationPoints = await this.checkIntegrationPoints();

      const health: IntegrationHealth = {
        overall: {
          score: overallScore,
          status: overallScore >= 95 ? 'healthy' : overallScore >= 80 ? 'degraded' : 'critical'
        },
        systems,
        integrationPoints
      };

      this.cachedHealth = health;
      this.lastHealthCheck = now;

      // Log health status
      await standardizedAuditLogger.logSecurityEvent(
        'system_health.integration_check',
        health.overall.status === 'critical' ? 'high' : 'low',
        {
          overallScore,
          status: health.overall.status,
          systemCount,
          outcome: 'success'
        },
        {}
      );

      return health;
    } catch (error) {
      await enhancedErrorHandler.handleSystemError(
        error as Error,
        'monitoring',
        { operation: 'integration_health_check' }
      );

      // Return emergency fallback health
      return this.getEmergencyHealth();
    }
  }

  private async checkSecuritySystemHealth(): Promise<SystemHealthCheck> {
    const startTime = performance.now();
    const issues: string[] = [];
    let score = 100;

    try {
      // Check threat detection service
      const healthStatus = enhancedThreatDetectionService.getHealthStatus();
      
      if (!healthStatus.healthy) {
        issues.push('Threat detection service degraded');
        score -= 20;
      }

      if (healthStatus.eventCount > 8000) {
        issues.push('High event volume detected');
        score -= 10;
      }

      if (healthStatus.correlationCount > 4000) {
        issues.push('High correlation count');
        score -= 10;
      }

      // Test threat analysis performance
      const testEvent = {
        action: 'health.test',
        outcome: 'success',
        userId: 'health-check',
        tenantId: 'health-check',
        timestamp: new Date().toISOString()
      };

      const analysisStart = performance.now();
      await enhancedThreatDetectionService.analyzeSecurityEvent(testEvent);
      const analysisTime = performance.now() - analysisStart;

      if (analysisTime > 5) {
        issues.push('Slow threat analysis response');
        score -= 15;
      }

      const responseTime = performance.now() - startTime;

      return {
        system: 'security',
        healthy: score >= 80,
        score,
        issues,
        lastChecked: new Date().toISOString(),
        performance: {
          responseTime,
          errorRate: issues.length > 0 ? 10 : 0,
          throughput: 1000 / Math.max(analysisTime, 1)
        }
      };
    } catch (error) {
      return {
        system: 'security',
        healthy: false,
        score: 0,
        issues: ['Security system health check failed'],
        lastChecked: new Date().toISOString(),
        performance: { responseTime: performance.now() - startTime, errorRate: 100, throughput: 0 }
      };
    }
  }

  private async checkAuditSystemHealth(): Promise<SystemHealthCheck> {
    const startTime = performance.now();
    const issues: string[] = [];
    let score = 100;

    try {
      // Check audit monitor performance
      const performanceStats = realTimeAuditMonitor.getPerformanceStats();
      
      if (performanceStats.activeQueries >= 3) {
        issues.push('High query load on audit system');
        score -= 15;
      }

      if (performanceStats.cacheSize > 1000) {
        issues.push('Large cache size may impact memory');
        score -= 10;
      }

      // Test audit logging performance
      const logStart = performance.now();
      await standardizedAuditLogger.logSecurityEvent(
        'health.audit_test',
        'low',
        { test: true, outcome: 'success' },
        {}
      );
      const logTime = performance.now() - logStart;

      if (logTime > 20) {
        issues.push('Slow audit logging response');
        score -= 20;
      }

      const responseTime = performance.now() - startTime;

      return {
        system: 'audit',
        healthy: score >= 80,
        score,
        issues,
        lastChecked: new Date().toISOString(),
        performance: {
          responseTime,
          errorRate: issues.length > 0 ? 5 : 0,
          throughput: 1000 / Math.max(logTime, 1)
        }
      };
    } catch (error) {
      return {
        system: 'audit',
        healthy: false,
        score: 0,
        issues: ['Audit system health check failed'],
        lastChecked: new Date().toISOString(),
        performance: { responseTime: performance.now() - startTime, errorRate: 100, throughput: 0 }
      };
    }
  }

  private async checkRBACSystemHealth(): Promise<SystemHealthCheck> {
    const startTime = performance.now();
    const issues: string[] = [];
    let score = 100;

    try {
      // Mock RBAC health check (would check actual RBAC service)
      // This would test permission resolution, caching, etc.
      
      const responseTime = performance.now() - startTime;
      
      // Simulate RBAC health metrics
      if (responseTime > 15) {
        issues.push('Slow RBAC response time');
        score -= 15;
      }

      return {
        system: 'rbac',
        healthy: score >= 80,
        score,
        issues,
        lastChecked: new Date().toISOString(),
        performance: {
          responseTime,
          errorRate: 0,
          throughput: 1000 / Math.max(responseTime, 1)
        }
      };
    } catch (error) {
      return {
        system: 'rbac',
        healthy: false,
        score: 0,
        issues: ['RBAC system health check failed'],
        lastChecked: new Date().toISOString(),
        performance: { responseTime: performance.now() - startTime, errorRate: 100, throughput: 0 }
      };
    }
  }

  private async checkTenantSystemHealth(): Promise<SystemHealthCheck> {
    const startTime = performance.now();
    const issues: string[] = [];
    let score = 100;

    try {
      // Mock tenant system health check
      const responseTime = performance.now() - startTime;

      return {
        system: 'tenant',
        healthy: score >= 80,
        score,
        issues,
        lastChecked: new Date().toISOString(),
        performance: {
          responseTime,
          errorRate: 0,
          throughput: 1000 / Math.max(responseTime, 1)
        }
      };
    } catch (error) {
      return {
        system: 'tenant',
        healthy: false,
        score: 0,
        issues: ['Tenant system health check failed'],
        lastChecked: new Date().toISOString(),
        performance: { responseTime: performance.now() - startTime, errorRate: 100, throughput: 0 }
      };
    }
  }

  private async checkIntegrationPoints(): Promise<Array<{from: string; to: string; healthy: boolean; latency: number}>> {
    const integrationTests = [
      { from: 'security', to: 'audit' },
      { from: 'rbac', to: 'audit' },
      { from: 'tenant', to: 'audit' },
      { from: 'security', to: 'rbac' },
      { from: 'tenant', to: 'rbac' }
    ];

    return Promise.all(integrationTests.map(async (test) => {
      const startTime = performance.now();
      try {
        // Test integration point (simplified)
        await new Promise(resolve => setTimeout(resolve, 1));
        const latency = performance.now() - startTime;
        
        return {
          from: test.from,
          to: test.to,
          healthy: latency < 10,
          latency
        };
      } catch (error) {
        return {
          from: test.from,
          to: test.to,
          healthy: false,
          latency: performance.now() - startTime
        };
      }
    }));
  }

  private getEmergencyHealth(): IntegrationHealth {
    return {
      overall: {
        score: 0,
        status: 'critical'
      },
      systems: {},
      integrationPoints: []
    };
  }

  async getHealthSummary(): Promise<string> {
    const health = await this.getIntegrationHealth();
    const systemIssues = Object.values(health.systems)
      .filter(system => !system.healthy)
      .map(system => system.system);

    if (health.overall.status === 'healthy') {
      return `All systems operational (${health.overall.score}/100)`;
    } else if (health.overall.status === 'degraded') {
      return `System degraded (${health.overall.score}/100) - Issues: ${systemIssues.join(', ')}`;
    } else {
      return `Critical system issues (${health.overall.score}/100) - Failed systems: ${systemIssues.join(', ')}`;
    }
  }
}

export const integrationHealthMonitor = IntegrationHealthMonitor.getInstance();
