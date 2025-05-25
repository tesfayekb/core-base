
// Audit Query Service - Fetches audit data for monitoring dashboards
// Integrates with existing enhancedAuditService for real-time monitoring

import { supabase } from '../database';
import { phase1Monitor } from '../performance/Phase1Monitor';

export interface SecurityEventSummary {
  id: string;
  timestamp: string;
  eventType: string;
  action: string;
  outcome: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  tenantId?: string;
  details: Record<string, any>;
  source: string;
}

export interface SecurityStatistics {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  authFailures: number;
  permissionDenials: number;
  suspiciousActivities: number;
  isolationViolations: number;
}

export interface TenantSecurityMetrics {
  totalTenants: number;
  accessViolations: number;
  suspiciousSwitching: number;
  isolationBreaches: number;
  activeUsers: number;
}

export class AuditQueryService {
  private static instance: AuditQueryService;

  static getInstance(): AuditQueryService {
    if (!AuditQueryService.instance) {
      AuditQueryService.instance = new AuditQueryService();
    }
    return AuditQueryService.instance;
  }

  async getRecentSecurityEvents(limit: number = 10): Promise<SecurityEventSummary[]> {
    try {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .in('event_type', ['security', 'auth', 'rbac'])
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch security events:', error);
        return [];
      }

      const duration = performance.now() - startTime;
      phase1Monitor.recordDatabaseQuery(duration);

      return (data || []).map(event => ({
        id: event.id,
        timestamp: event.timestamp,
        eventType: event.event_type,
        action: event.action,
        outcome: event.details?.outcome || 'unknown',
        severity: this.determineSeverity(event),
        userId: event.user_id,
        tenantId: event.tenant_id,
        details: event.details || {},
        source: event.details?.source || 'system'
      }));
    } catch (error) {
      console.error('Error querying security events:', error);
      return [];
    }
  }

  async getSecurityStatistics(timeframe: string = '24h'): Promise<SecurityStatistics> {
    try {
      const startTime = performance.now();
      const since = this.getTimeframeCutoff(timeframe);
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('event_type, action, details')
        .in('event_type', ['security', 'auth', 'rbac'])
        .gte('timestamp', since.toISOString());

      if (error) {
        console.error('Failed to fetch security statistics:', error);
        return this.getEmptyStatistics();
      }

      const duration = performance.now() - startTime;
      phase1Monitor.recordDatabaseQuery(duration);

      return this.calculateStatistics(data || []);
    } catch (error) {
      console.error('Error calculating security statistics:', error);
      return this.getEmptyStatistics();
    }
  }

  async getTenantSecurityMetrics(): Promise<TenantSecurityMetrics> {
    try {
      const startTime = performance.now();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      
      // Get tenant count
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id');

      // Get security violations
      const { data: violations } = await supabase
        .from('audit_logs')
        .select('action, details, tenant_id')
        .eq('event_type', 'security')
        .gte('timestamp', since.toISOString());

      // Get active users
      const { data: activeUsers } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('is_active', true)
        .gte('last_accessed_at', since.toISOString());

      const duration = performance.now() - startTime;
      phase1Monitor.recordDatabaseQuery(duration);

      return this.calculateTenantMetrics(
        tenants || [],
        violations || [],
        activeUsers || []
      );
    } catch (error) {
      console.error('Error fetching tenant security metrics:', error);
      return {
        totalTenants: 0,
        accessViolations: 0,
        suspiciousSwitching: 0,
        isolationBreaches: 0,
        activeUsers: 0
      };
    }
  }

  private determineSeverity(event: any): 'low' | 'medium' | 'high' | 'critical' {
    const { action, details } = event;
    
    if (action === 'breach_attempt' || details?.severity === 'critical') {
      return 'critical';
    }
    if (action === 'suspicious_activity' || details?.severity === 'high') {
      return 'high';
    }
    if (action === 'access_denied' || details?.severity === 'medium') {
      return 'medium';
    }
    return 'low';
  }

  private getTimeframeCutoff(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private calculateStatistics(events: any[]): SecurityStatistics {
    return events.reduce((stats, event) => {
      const severity = this.determineSeverity(event);
      stats.total++;
      stats[severity]++;
      
      if (event.action.includes('login') && event.details?.outcome === 'failure') {
        stats.authFailures++;
      }
      if (event.action === 'access_denied') {
        stats.permissionDenials++;
      }
      if (event.action === 'suspicious_activity') {
        stats.suspiciousActivities++;
      }
      if (event.action.includes('isolation')) {
        stats.isolationViolations++;
      }
      
      return stats;
    }, this.getEmptyStatistics());
  }

  private calculateTenantMetrics(tenants: any[], violations: any[], activeUsers: any[]): TenantSecurityMetrics {
    const accessViolations = violations.filter(v => 
      v.action === 'access_denied' || v.action === 'unauthorized_access'
    ).length;
    
    const suspiciousSwitching = violations.filter(v => 
      v.details?.operation?.includes('tenant_switch')
    ).length;
    
    const isolationBreaches = violations.filter(v => 
      v.action.includes('isolation') || v.details?.isolation === false
    ).length;

    return {
      totalTenants: tenants.length,
      accessViolations,
      suspiciousSwitching,
      isolationBreaches,
      activeUsers: new Set(activeUsers.map(u => u.user_id)).size
    };
  }

  private getEmptyStatistics(): SecurityStatistics {
    return {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      authFailures: 0,
      permissionDenials: 0,
      suspiciousActivities: 0,
      isolationViolations: 0
    };
  }
}

export const auditQueryService = AuditQueryService.getInstance();
