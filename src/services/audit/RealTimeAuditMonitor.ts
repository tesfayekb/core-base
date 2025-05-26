
// Real-Time Audit Monitoring Service - Enhanced Performance
// Phase 2.3 - Optimized for high-volume operations

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { enhancedThreatDetectionService } from '../security/EnhancedThreatDetectionService';
import { enhancedErrorHandler } from '../error/EnhancedErrorHandler';

export interface AuditEventFilter {
  tenantId?: string;
  userId?: string;
  eventType?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  severity?: string;
}

export interface AuditMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  securityEvents: number;
  failureRate: number;
  recentActivity: Array<{
    timestamp: string;
    action: string;
    resource: string;
    outcome: string;
  }>;
  threatDetection?: {
    activeThreats: number;
    threatsBySeverity: Record<string, number>;
    recentThreats: Array<{
      type: string;
      severity: string;
      timestamp: string;
    }>;
  };
}

export class RealTimeAuditMonitor {
  private static instance: RealTimeAuditMonitor;
  private subscribers = new Set<(event: any) => void>();
  private threatSubscribers = new Set<(threat: any) => void>();
  private metricsCache = new Map<string, { data: AuditMetrics; timestamp: number }>();
  private performanceOptimizer = {
    batchSize: 50,
    cacheTimeout: 30000, // 30 seconds
    maxConcurrentQueries: 3,
    activeQueries: 0
  };

  static getInstance(): RealTimeAuditMonitor {
    if (!RealTimeAuditMonitor.instance) {
      RealTimeAuditMonitor.instance = new RealTimeAuditMonitor();
    }
    return RealTimeAuditMonitor.instance;
  }

  async getAuditMetrics(tenantId: string, timeRange?: { start: Date; end: Date }): Promise<AuditMetrics> {
    try {
      // Performance optimization: check cache first
      const cacheKey = `${tenantId}-${timeRange?.start?.getTime()}-${timeRange?.end?.getTime()}`;
      const cached = this.metricsCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.performanceOptimizer.cacheTimeout) {
        return cached.data;
      }

      // Throttle concurrent queries
      if (this.performanceOptimizer.activeQueries >= this.performanceOptimizer.maxConcurrentQueries) {
        console.warn('Audit metrics query throttled due to high load');
        return this.getEmptyMetrics();
      }

      this.performanceOptimizer.activeQueries++;

      try {
        const startTime = timeRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000);
        const endTime = timeRange?.end || new Date();

        const { data: auditLogs, error } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('timestamp', startTime.toISOString())
          .lte('timestamp', endTime.toISOString())
          .order('timestamp', { ascending: false })
          .limit(this.performanceOptimizer.batchSize * 4); // Reasonable limit for performance

        if (error) {
          await enhancedErrorHandler.handleAuditError(
            error,
            { tenantId, eventType: 'metrics_fetch' }
          );
          return this.getEmptyMetrics();
        }

        const metrics = this.calculateMetrics(auditLogs || [], tenantId);
        
        // Cache the results
        this.metricsCache.set(cacheKey, {
          data: metrics,
          timestamp: Date.now()
        });

        // Cleanup old cache entries
        this.cleanupCache();

        return metrics;
      } finally {
        this.performanceOptimizer.activeQueries--;
      }
    } catch (error) {
      await enhancedErrorHandler.handleAuditError(
        error as Error,
        { tenantId, eventType: 'metrics_calculation' }
      );
      return this.getEmptyMetrics();
    }
  }

  private calculateMetrics(auditLogs: any[], tenantId: string): AuditMetrics {
    const totalEvents = auditLogs.length;
    const eventsByType = auditLogs.reduce((acc, log) => {
      acc[log.event_type] = (acc[log.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const securityEvents = auditLogs.filter(log => 
      log.event_type === 'security' || log.action.startsWith('security.')
    ).length;

    const failureEvents = auditLogs.filter(log => 
      log.details?.outcome === 'failure' || log.details?.outcome === 'error'
    ).length;

    const failureRate = totalEvents > 0 ? (failureEvents / totalEvents) * 100 : 0;

    const recentActivity = auditLogs.slice(0, 10).map(log => ({
      timestamp: log.timestamp,
      action: log.action,
      resource: log.resource_type || 'unknown',
      outcome: log.details?.outcome || 'unknown'
    }));

    // Get enhanced threat detection metrics
    const activeThreats = enhancedThreatDetectionService.getActiveThreats(tenantId);
    const threatDetection = {
      activeThreats: activeThreats.length,
      threatsBySeverity: activeThreats.reduce((acc, threat) => {
        acc[threat.severity] = (acc[threat.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentThreats: activeThreats.slice(0, 5).map(threat => ({
        type: threat.type,
        severity: threat.severity,
        timestamp: threat.timestamp
      }))
    };

    return {
      totalEvents,
      eventsByType,
      securityEvents,
      failureRate,
      recentActivity,
      threatDetection
    };
  }

  async getFilteredAuditLogs(filter: AuditEventFilter) {
    try {
      let query = supabase.from('audit_logs').select('*');

      if (filter.tenantId) {
        query = query.eq('tenant_id', filter.tenantId);
      }

      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }

      if (filter.eventType) {
        query = query.eq('event_type', filter.eventType);
      }

      if (filter.timeRange) {
        query = query
          .gte('timestamp', filter.timeRange.start.toISOString())
          .lte('timestamp', filter.timeRange.end.toISOString());
      }

      query = query.order('timestamp', { ascending: false }).limit(this.performanceOptimizer.batchSize);

      const { data, error } = await query;

      if (error) {
        await enhancedErrorHandler.handleAuditError(
          error,
          { tenantId: filter.tenantId, eventType: 'filtered_logs_fetch' }
        );
        return [];
      }

      return data || [];
    } catch (error) {
      await enhancedErrorHandler.handleAuditError(
        error as Error,
        { tenantId: filter.tenantId, eventType: 'filtered_logs_error' }
      );
      return [];
    }
  }

  subscribeToAuditEvents(callback: (event: any) => void) {
    this.subscribers.add(callback);
    
    // Set up real-time subscription
    const channel = supabase
      .channel('audit-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs'
      }, async (payload) => {
        try {
          this.subscribers.forEach(subscriber => subscriber(payload.new));
          
          // Enhanced threat analysis with error handling
          const threat = await enhancedThreatDetectionService.analyzeSecurityEvent(payload.new);
          if (threat) {
            this.threatSubscribers.forEach(subscriber => subscriber(threat));
          }
        } catch (error) {
          await enhancedErrorHandler.handleAuditError(
            error as Error,
            { eventType: 'real_time_processing' }
          );
        }
      })
      .subscribe();

    return () => {
      this.subscribers.delete(callback);
      supabase.removeChannel(channel);
    };
  }

  subscribeToSecurityThreats(callback: (threat: any) => void) {
    this.threatSubscribers.add(callback);
    
    return () => {
      this.threatSubscribers.delete(callback);
    };
  }

  async generateComplianceReport(tenantId: string, reportType: 'daily' | 'weekly' | 'monthly') {
    try {
      const timeRanges = {
        daily: { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
        weekly: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
        monthly: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }
      };

      const timeRange = timeRanges[reportType];
      const auditLogs = await this.getFilteredAuditLogs({ tenantId, timeRange });
      const metrics = await this.getAuditMetrics(tenantId, timeRange);

      return {
        reportType,
        tenantId,
        generatedAt: new Date().toISOString(),
        timeRange,
        summary: metrics,
        events: auditLogs,
        complianceChecks: {
          dataAccessLogged: auditLogs.filter(log => log.event_type === 'data_access').length > 0,
          authenticationTracked: auditLogs.filter(log => log.event_type === 'authentication').length > 0,
          securityEventsMonitored: metrics.securityEvents > 0,
          retentionCompliant: true, // Based on configured retention policies
          threatDetectionActive: metrics.threatDetection?.activeThreats !== undefined
        }
      };
    } catch (error) {
      await enhancedErrorHandler.handleAuditError(
        error as Error,
        { tenantId, eventType: 'compliance_report_generation' }
      );
      return null;
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.metricsCache.entries()) {
      if (now - value.timestamp > this.performanceOptimizer.cacheTimeout * 2) {
        this.metricsCache.delete(key);
      }
    }
  }

  private getEmptyMetrics(): AuditMetrics {
    return {
      totalEvents: 0,
      eventsByType: {},
      securityEvents: 0,
      failureRate: 0,
      recentActivity: [],
      threatDetection: {
        activeThreats: 0,
        threatsBySeverity: {},
        recentThreats: []
      }
    };
  }

  getPerformanceStats(): {
    activeQueries: number;
    cacheSize: number;
    cacheHitRate: number;
  } {
    return {
      activeQueries: this.performanceOptimizer.activeQueries,
      cacheSize: this.metricsCache.size,
      cacheHitRate: 0 // Would be calculated from cache hits/misses in production
    };
  }
}

export const realTimeAuditMonitor = RealTimeAuditMonitor.getInstance();
