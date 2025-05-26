import { supabase } from '@/services/database/connection';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export interface TenantProfile {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: 'active' | 'inactive' | 'pending_verification' | 'suspended';
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  tenantId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  lastAccessedAt: Date;
  logoutTime: Date | null;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  timestamp: Date;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowthRate: number;
}

export interface UsagePattern {
  feature: string;
  usageCount: number;
  uniqueUsers: number;
  averageSessionTime: number;
  peakHours: number[];
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  userId: string;
  timestamp: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
}

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

class UserAnalyticsService {
  async getUserMetrics(tenantId: string, timeRange: AnalyticsTimeRange): Promise<UserMetrics> {
    try {
      const { start, end } = timeRange;
      
      // Get total users for tenant
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Get active users (users with recent activity)
      const { count: activeUsers } = await supabase
        .from('user_sessions')
        .select('user_id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('last_accessed_at', start.toISOString())
        .lte('last_accessed_at', end.toISOString());

      // Get new users in period
      const { count: newUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Calculate growth rate
      const previousPeriodStart = new Date(start);
      previousPeriodStart.setDate(start.getDate() - (end.getDate() - start.getDate()));
      
      const { count: previousNewUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', previousPeriodStart.toISOString())
        .lte('created_at', start.toISOString());

      const userGrowthRate = previousNewUsers ? 
        ((newUsers || 0) - (previousNewUsers || 0)) / (previousNewUsers || 1) * 100 : 0;

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsers: newUsers || 0,
        userGrowthRate
      };
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      throw new Error('Failed to fetch user metrics');
    }
  }

  async getUsagePatterns(tenantId: string, timeRange: AnalyticsTimeRange): Promise<UsagePattern[]> {
    try {
      // Get audit logs for usage analysis
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('action, user_id, timestamp, details')
        .eq('tenant_id', tenantId)
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
        .order('timestamp', { ascending: false });

      if (!auditLogs) return [];

      // Group by feature/action
      const featureUsage = new Map<string, {
        count: number;
        users: Set<string>;
        sessionTimes: number[];
        hours: number[];
      }>();

      auditLogs.forEach(log => {
        const feature = log.action || 'unknown';
        const hour = new Date(log.timestamp).getHours();
        
        if (!featureUsage.has(feature)) {
          featureUsage.set(feature, {
            count: 0,
            users: new Set(),
            sessionTimes: [],
            hours: []
          });
        }

        const usage = featureUsage.get(feature)!;
        usage.count++;
        usage.users.add(log.user_id);
        usage.hours.push(hour);
        
        // Simulate session time (in real app, this would come from session data)
        usage.sessionTimes.push(Math.random() * 30 + 5); // 5-35 minutes
      });

      // Convert to UsagePattern array
      return Array.from(featureUsage.entries()).map(([feature, data]) => {
        const peakHours = this.calculatePeakHours(data.hours);
        const averageSessionTime = data.sessionTimes.reduce((a, b) => a + b, 0) / data.sessionTimes.length;

        return {
          feature,
          usageCount: data.count,
          uniqueUsers: data.users.size,
          averageSessionTime,
          peakHours
        };
      }).sort((a, b) => b.usageCount - a.usageCount);
    } catch (error) {
      console.error('Error fetching usage patterns:', error);
      throw new Error('Failed to fetch usage patterns');
    }
  }

  async getSecurityEvents(tenantId: string, timeRange: AnalyticsTimeRange): Promise<SecurityEvent[]> {
    try {
      // Get security-related audit logs
      const { data: securityLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('event_type', ['security_event', 'authentication_event', 'authorization_event'])
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
        .order('timestamp', { ascending: false });

      if (!securityLogs) return [];

      return securityLogs.map(log => ({
        id: log.id,
        eventType: log.action || 'unknown',
        userId: log.user_id || 'system',
        timestamp: new Date(log.timestamp),
        riskLevel: this.calculateRiskLevel(log),
        description: this.generateEventDescription(log),
        metadata: log.details || {}
      }));
    } catch (error) {
      console.error('Error fetching security events:', error);
      throw new Error('Failed to fetch security events');
    }
  }

  async getUserActivityTimeline(userId: string, tenantId: string, days: number = 30): Promise<any[]> {
    try {
      const startDate = subDays(new Date(), days);
      
      const { data: activities } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      return activities || [];
    } catch (error) {
      console.error('Error fetching user activity timeline:', error);
      throw new Error('Failed to fetch user activity timeline');
    }
  }

  async getTenantAnalyticsSummary(tenantId: string): Promise<Record<string, any>> {
    try {
      const timeRange: AnalyticsTimeRange = {
        start: subDays(new Date(), 30),
        end: new Date(),
        period: 'month'
      };

      const [userMetrics, usagePatterns, securityEvents] = await Promise.all([
        this.getUserMetrics(tenantId, timeRange),
        this.getUsagePatterns(tenantId, timeRange),
        this.getSecurityEvents(tenantId, timeRange)
      ]);

      return {
        userMetrics,
        topFeatures: usagePatterns.slice(0, 5),
        securitySummary: {
          totalEvents: securityEvents.length,
          criticalEvents: securityEvents.filter(e => e.riskLevel === 'critical').length,
          highRiskEvents: securityEvents.filter(e => e.riskLevel === 'high').length
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating tenant analytics summary:', error);
      throw new Error('Failed to generate analytics summary');
    }
  }

  private calculatePeakHours(hours: number[]): number[] {
    const hourCounts = new Array(24).fill(0);
    hours.forEach(hour => hourCounts[hour]++);
    
    const maxCount = Math.max(...hourCounts);
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count >= maxCount * 0.8)
      .map(({ hour }) => hour);
  }

  private calculateRiskLevel(log: any): 'low' | 'medium' | 'high' | 'critical' {
    const action = log.action?.toLowerCase() || '';
    
    if (action.includes('failed_login') || action.includes('unauthorized')) {
      return 'high';
    }
    if (action.includes('permission_denied') || action.includes('invalid_access')) {
      return 'medium';
    }
    if (action.includes('login') || action.includes('logout')) {
      return 'low';
    }
    
    return 'low';
  }

  private generateEventDescription(log: any): string {
    const action = log.action || 'Unknown action';
    const resource = log.resource_type || 'resource';
    
    return `${action} on ${resource}`;
  }
}

export const userAnalyticsService = new UserAnalyticsService();
