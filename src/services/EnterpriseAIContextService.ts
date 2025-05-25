
// Enterprise AI Context Service
// Enhanced AI Context System with enterprise features

import { AIContextData, ImplementationState } from '@/types/ImplementationState';
import { aiContextService } from './AIContextService';
import { enhancedAuditService } from './audit/enhancedAuditService';
import { configurationManager, TenantConfiguration } from './ConfigurationManager';
import { DetailedPerformanceMetrics, SystemMetrics } from './performance/metrics/MetricsTypes';

export interface EnterpriseContextData extends AIContextData {
  tenantId?: string;
  performanceMetrics: DetailedPerformanceMetrics;
  auditTrail: AuditTrailEntry[];
  featureFlags: Record<string, boolean>;
  securityAlerts: SecurityAlert[];
}

export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  action: string;
  userId?: string;
  tenantId?: string;
  details: Record<string, any>;
  duration: number;
}

export interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

class EnterpriseAIContextServiceClass {
  private cache = new Map<string, EnterpriseContextData>();
  private auditTrail: AuditTrailEntry[] = [];
  private performanceMetrics: DetailedPerformanceMetrics | null = null;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_AUDIT_ENTRIES = 1000;

  async generateEnterpriseContext(
    tenantId?: string,
    userId?: string
  ): Promise<EnterpriseContextData> {
    const startTime = Date.now();
    const auditId = this.generateAuditId();

    try {
      console.log(`🏢 Generating enterprise AI context for tenant: ${tenantId || 'global'}`);

      // Check tenant-specific cache
      const cacheKey = this.getCacheKey(tenantId);
      if (this.isCacheValid(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        await this.logAuditEvent('context_cache_hit', startTime, auditId, { tenantId, userId });
        return cached;
      }

      // Get base context
      const baseContext = await aiContextService.generateAIContext();

      // Get tenant configuration
      const tenantConfig = tenantId ? configurationManager.getTenantConfiguration(tenantId) : null;
      const featureFlags = this.getFeatureFlags(tenantId);

      // Collect performance metrics
      const performanceMetrics = await this.collectPerformanceMetrics();

      // Generate security alerts
      const securityAlerts = await this.generateSecurityAlerts(performanceMetrics, tenantId);

      // Create enterprise context
      const enterpriseContext: EnterpriseContextData = {
        ...baseContext,
        tenantId,
        performanceMetrics,
        auditTrail: this.getRecentAuditTrail(tenantId),
        featureFlags,
        securityAlerts
      };

      // Update cache
      this.cache.set(cacheKey, enterpriseContext);

      // Log audit event
      await this.logAuditEvent('context_generated', startTime, auditId, {
        tenantId,
        userId,
        features: Object.keys(featureFlags).filter(key => featureFlags[key]),
        alertCount: securityAlerts.length
      });

      console.log(`✅ Enterprise AI context generated successfully (${Date.now() - startTime}ms)`);
      return enterpriseContext;

    } catch (error) {
      await this.logAuditEvent('context_generation_failed', startTime, auditId, {
        tenantId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private getCacheKey(tenantId?: string): string {
    return tenantId ? `tenant_${tenantId}` : 'global';
  }

  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;

    // Check if any audit entries exist after cache timestamp
    const cacheTime = cached.auditTrail[0]?.timestamp || new Date(0);
    const hasRecentActivity = this.auditTrail.some(
      entry => entry.timestamp > cacheTime
    );

    return !hasRecentActivity;
  }

  private getFeatureFlags(tenantId?: string): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    
    configurationManager.getAllFeatures().forEach(feature => {
      flags[feature.id] = configurationManager.isFeatureEnabled(feature.id, tenantId);
    });

    return flags;
  }

  private async collectPerformanceMetrics(): Promise<DetailedPerformanceMetrics> {
    // Simulate performance metrics collection
    // In a real implementation, this would collect actual metrics
    const metrics: DetailedPerformanceMetrics = {
      system: {
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        uptime: Date.now(),
        activeConnections: Math.floor(Math.random() * 1000),
        requestsPerSecond: Math.floor(Math.random() * 500),
        errorRate: Math.random() * 5
      },
      database: {
        totalQueries: Math.floor(Math.random() * 10000),
        queriesPerSecond: Math.floor(Math.random() * 100),
        averageQueryTime: Math.random() * 100,
        slowQueries: Math.floor(Math.random() * 10),
        connectionPoolUtilization: Math.random() * 100,
        cacheHitRate: 80 + Math.random() * 20,
        indexEfficiency: 90 + Math.random() * 10
      },
      security: {
        authenticationLatency: Math.random() * 500,
        permissionCheckLatency: Math.random() * 50,
        securityEventsPerMinute: Math.floor(Math.random() * 10),
        tenantSwitchLatency: Math.random() * 200,
        auditWriteLatency: Math.random() * 100,
        securityValidationRate: 95 + Math.random() * 5
      },
      user: {
        pageLoadTime: Math.random() * 3000,
        timeToInteractive: Math.random() * 5000,
        firstContentfulPaint: Math.random() * 2000,
        cumulativeLayoutShift: Math.random() * 0.1,
        navigationTiming: Math.random() * 1000,
        apiResponseTimes: {
          '/api/auth': Math.random() * 500,
          '/api/users': Math.random() * 300,
          '/api/permissions': Math.random() * 200
        }
      },
      network: {
        bandwidth: Math.random() * 1000,
        latency: Math.random() * 100,
        packetLoss: Math.random() * 1,
        connectionQuality: 'good'
      },
      memory: {
        heapUsed: Math.random() * 100000000,
        heapTotal: Math.random() * 200000000,
        rss: Math.random() * 150000000,
        external: Math.random() * 50000000,
        gcDuration: Math.random() * 10,
        gcFrequency: Math.random() * 5
      }
    };

    this.performanceMetrics = metrics;
    return metrics;
  }

  private async generateSecurityAlerts(
    metrics: DetailedPerformanceMetrics,
    tenantId?: string
  ): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];

    // Check for performance issues
    if (metrics.system.requestsPerSecond > 400) {
      const alert: SecurityAlert = {
        id: this.generateAlertId(),
        severity: 'medium',
        message: `High request rate detected: ${metrics.system.requestsPerSecond} req/s`,
        timestamp: new Date(),
        resolved: false
      };
      alerts.push(alert);

      // Log security event for high request rate
      await enhancedAuditService.logSecurityEvent(
        'suspicious_activity',
        'success',
        {
          alertType: 'high_request_rate',
          requestsPerSecond: metrics.system.requestsPerSecond,
          threshold: 400
        },
        { tenantId }
      );
    }

    // Check for authentication issues
    if (metrics.security.authenticationLatency > 1000) {
      alerts.push({
        id: this.generateAlertId(),
        severity: 'high',
        message: `High authentication latency: ${metrics.security.authenticationLatency}ms`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check for database performance
    if (metrics.database.cacheHitRate < 80) {
      alerts.push({
        id: this.generateAlertId(),
        severity: 'medium',
        message: `Low cache hit rate: ${metrics.database.cacheHitRate}%`,
        timestamp: new Date(),
        resolved: false
      });
    }

    return alerts;
  }

  private async logAuditEvent(
    action: string,
    startTime: number,
    auditId: string,
    details: Record<string, any>
  ): Promise<void> {
    const duration = Date.now() - startTime;
    
    const auditEntry: AuditTrailEntry = {
      id: auditId,
      timestamp: new Date(),
      action,
      userId: details.userId,
      tenantId: details.tenantId,
      details: { ...details, duration },
      duration
    };

    this.auditTrail.push(auditEntry);
    
    // Limit audit trail size
    if (this.auditTrail.length > this.MAX_AUDIT_ENTRIES) {
      this.auditTrail = this.auditTrail.slice(-this.MAX_AUDIT_ENTRIES);
    }

    // Log to enhanced audit service
    try {
      await enhancedAuditService.logSecurityEvent(
        'suspicious_activity',
        'success',
        {
          contextAction: action,
          ...details
        },
        {
          tenantId: details.tenantId,
          userId: details.userId
        }
      );
    } catch (error) {
      console.warn('Failed to log to enhanced audit service:', error);
    }
  }

  private getRecentAuditTrail(tenantId?: string): AuditTrailEntry[] {
    const recent = this.auditTrail
      .filter(entry => !tenantId || entry.tenantId === tenantId)
      .slice(-50); // Last 50 entries

    return recent;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Tenant-specific operations
  async updateTenantConfiguration(
    tenantId: string,
    config: Partial<TenantConfiguration>
  ): Promise<void> {
    configurationManager.updateTenantConfiguration(tenantId, config);
    
    // Invalidate cache for this tenant
    this.cache.delete(this.getCacheKey(tenantId));
    
    await this.logAuditEvent('tenant_config_updated', Date.now(), this.generateAuditId(), {
      tenantId,
      configUpdates: Object.keys(config)
    });
  }

  async getTenantMetrics(tenantId: string): Promise<{
    performanceMetrics: DetailedPerformanceMetrics | null;
    auditTrail: AuditTrailEntry[];
    securityAlerts: SecurityAlert[];
    featureFlags: Record<string, boolean>;
  }> {
    return {
      performanceMetrics: this.performanceMetrics,
      auditTrail: this.getRecentAuditTrail(tenantId),
      securityAlerts: [], // Would be filtered by tenant in real implementation
      featureFlags: this.getFeatureFlags(tenantId)
    };
  }

  // Global administrative operations
  async getGlobalMetrics(): Promise<{
    totalTenants: number;
    activeContexts: number;
    totalAuditEntries: number;
    systemHealth: 'healthy' | 'degraded' | 'critical';
  }> {
    const systemHealth = this.performanceMetrics?.system.errorRate > 5 ? 'critical' :
                        this.performanceMetrics?.system.errorRate > 2 ? 'degraded' : 'healthy';

    return {
      totalTenants: this.cache.size,
      activeContexts: this.cache.size,
      totalAuditEntries: this.auditTrail.length,
      systemHealth
    };
  }

  async invalidateCache(tenantId?: string): Promise<void> {
    if (tenantId) {
      this.cache.delete(this.getCacheKey(tenantId));
      console.log(`🗑️ Enterprise AI context cache invalidated for tenant: ${tenantId}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Enterprise AI context cache cleared');
    }

    await this.logAuditEvent('cache_invalidated', Date.now(), this.generateAuditId(), {
      tenantId: tenantId || 'global'
    });
  }
}

export const enterpriseAIContextService = new EnterpriseAIContextServiceClass();
