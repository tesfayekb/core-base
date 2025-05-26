
// User Analytics Service
// Phase 2.4.3: Analytics & Reporting Implementation

import { supabase } from '@/lib/database/connection';
import { auditLogger } from '@/services/audit/AuditLogger';

export interface UserActivityMetrics {
  userId: string;
  totalSessions: number;
  averageSessionDuration: number;
  lastActivity: Date;
  actionsPerformed: number;
  mostUsedFeatures: string[];
  loginFrequency: number;
  securityEvents: number;
}

export interface UsagePattern {
  feature: string;
  usageCount: number;
  lastUsed: Date;
  averageUsagePerSession: number;
  peakUsageHours: number[];
}

export interface SecurityEventCorrelation {
  userId: string;
  eventType: string;
  frequency: number;
  riskScore: number;
  relatedEvents: string[];
  timePattern: {
    hourOfDay: number;
    dayOfWeek: number;
  };
}

export interface TenantAnalytics {
  tenantId: string;
  activeUsers: number;
  totalSessions: number;
  averageUserEngagement: number;
  topFeatures: string[];
  securityAlerts: number;
  performanceMetrics: {
    averageResponseTime: number;
    errorRate: number;
  };
}

export class UserAnalyticsService {
  private static instance: UserAnalyticsService;

  static getInstance(): UserAnalyticsService {
    if (!UserAnalyticsService.instance) {
      UserAnalyticsService.instance = new UserAnalyticsService();
    }
    return UserAnalyticsService.instance;
  }

  async getUserActivityMetrics(userId: string, tenantId: string): Promise<UserActivityMetrics> {
    try {
      // Get user sessions data
      const { data: sessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get audit logs for user actions
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (auditError) throw auditError;

      // Calculate metrics
      const totalSessions = sessions?.length || 0;
      const lastActivity = sessions?.[0]?.last_accessed_at 
        ? new Date(sessions[0].last_accessed_at) 
        : new Date();

      const actionsPerformed = auditLogs?.length || 0;
      const securityEvents = auditLogs?.filter(log => 
        log.event_type === 'security' || log.event_type === 'authentication'
      )?.length || 0;

      // Calculate average session duration
      const sessionDurations = sessions?.map(session => {
        const start = new Date(session.created_at);
        const end = new Date(session.last_accessed_at || session.created_at);
        return end.getTime() - start.getTime();
      }) || [];

      const averageSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
        : 0;

      // Extract most used features from audit logs
      const featureUsage = new Map<string, number>();
      auditLogs?.forEach(log => {
        const feature = log.resource_type || 'unknown';
        featureUsage.set(feature, (featureUsage.get(feature) || 0) + 1);
      });

      const mostUsedFeatures = Array.from(featureUsage.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([feature]) => feature);

      // Calculate login frequency (logins per week)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentSessions = sessions?.filter(session => 
        new Date(session.created_at) > oneWeekAgo
      ) || [];
      const loginFrequency = recentSessions.length;

      return {
        userId,
        totalSessions,
        averageSessionDuration: Math.round(averageSessionDuration / 1000 / 60), // Convert to minutes
        lastActivity,
        actionsPerformed,
        mostUsedFeatures,
        loginFrequency,
        securityEvents
      };
    } catch (error) {
      console.error('Failed to get user activity metrics:', error);
      throw error;
    }
  }

  async getUsagePatterns(tenantId: string, timeRange: number = 30): Promise<UsagePattern[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeRange);

      const { data: auditLogs, error } = await supabase
        .from('audit_logs')
        .select('resource_type, action, timestamp')
        .eq('tenant_id', tenantId)
        .gte('timestamp', cutoffDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const patterns = new Map<string, {
        count: number;
        lastUsed: Date;
        hourUsage: Map<number, number>;
        sessionCounts: number[];
      }>();

      auditLogs?.forEach(log => {
        const feature = log.resource_type || 'unknown';
        const timestamp = new Date(log.timestamp);
        const hour = timestamp.getHours();

        if (!patterns.has(feature)) {
          patterns.set(feature, {
            count: 0,
            lastUsed: timestamp,
            hourUsage: new Map(),
            sessionCounts: []
          });
        }

        const pattern = patterns.get(feature)!;
        pattern.count++;
        if (timestamp > pattern.lastUsed) {
          pattern.lastUsed = timestamp;
        }
        pattern.hourUsage.set(hour, (pattern.hourUsage.get(hour) || 0) + 1);
      });

      return Array.from(patterns.entries()).map(([feature, data]) => {
        const peakUsageHours = Array.from(data.hourUsage.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([hour]) => hour);

        return {
          feature,
          usageCount: data.count,
          lastUsed: data.lastUsed,
          averageUsagePerSession: data.count / Math.max(1, data.sessionCounts.length),
          peakUsageHours
        };
      }).sort((a, b) => b.usageCount - a.usageCount);
    } catch (error) {
      console.error('Failed to get usage patterns:', error);
      throw error;
    }
  }

  async getSecurityEventCorrelation(tenantId: string): Promise<SecurityEventCorrelation[]> {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data: securityLogs, error } = await supabase
        .from('audit_logs')
        .select('user_id, event_type, action, timestamp')
        .eq('tenant_id', tenantId)
        .in('event_type', ['security', 'authentication', 'authorization'])
        .gte('timestamp', oneMonthAgo.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const correlations = new Map<string, {
        events: Map<string, number>;
        times: Date[];
      }>();

      securityLogs?.forEach(log => {
        const userId = log.user_id || 'anonymous';
        const eventType = `${log.event_type}.${log.action}`;
        const timestamp = new Date(log.timestamp);

        if (!correlations.has(userId)) {
          correlations.set(userId, {
            events: new Map(),
            times: []
          });
        }

        const userCorrelation = correlations.get(userId)!;
        userCorrelation.events.set(eventType, (userCorrelation.events.get(eventType) || 0) + 1);
        userCorrelation.times.push(timestamp);
      });

      return Array.from(correlations.entries()).map(([userId, data]) => {
        const totalEvents = Array.from(data.events.values()).reduce((sum, count) => sum + count, 0);
        const mostFrequentEvent = Array.from(data.events.entries())
          .sort(([, a], [, b]) => b - a)[0];

        // Calculate risk score based on frequency and event types
        let riskScore = 0;
        data.events.forEach((count, eventType) => {
          if (eventType.includes('failed') || eventType.includes('denied')) {
            riskScore += count * 2;
          } else {
            riskScore += count * 0.5;
          }
        });

        // Normalize risk score (0-100)
        riskScore = Math.min(100, (riskScore / totalEvents) * 10);

        // Calculate time patterns
        const hours = data.times.map(time => time.getHours());
        const days = data.times.map(time => time.getDay());
        const avgHour = hours.reduce((sum, hour) => sum + hour, 0) / hours.length;
        const avgDay = days.reduce((sum, day) => sum + day, 0) / days.length;

        return {
          userId,
          eventType: mostFrequentEvent?.[0] || 'unknown',
          frequency: totalEvents,
          riskScore: Math.round(riskScore),
          relatedEvents: Array.from(data.events.keys()),
          timePattern: {
            hourOfDay: Math.round(avgHour),
            dayOfWeek: Math.round(avgDay)
          }
        };
      }).sort((a, b) => b.riskScore - a.riskScore);
    } catch (error) {
      console.error('Failed to get security event correlation:', error);
      throw error;
    }
  }

  async getTenantAnalytics(tenantId: string): Promise<TenantAnalytics> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get active users count
      const { data: activeSessions, error: sessionError } = await supabase
        .from('user_sessions')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .gte('last_accessed_at', oneWeekAgo.toISOString());

      if (sessionError) throw sessionError;

      const activeUsers = new Set(activeSessions?.map(s => s.user_id)).size;

      // Get total sessions
      const { data: allSessions, error: totalSessionError } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('created_at', oneWeekAgo.toISOString());

      if (totalSessionError) throw totalSessionError;

      // Get audit logs for features and security
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('resource_type, event_type')
        .eq('tenant_id', tenantId)
        .gte('timestamp', oneWeekAgo.toISOString());

      if (auditError) throw auditError;

      // Calculate top features
      const featureUsage = new Map<string, number>();
      auditLogs?.forEach(log => {
        if (log.resource_type && log.event_type !== 'security') {
          featureUsage.set(log.resource_type, (featureUsage.get(log.resource_type) || 0) + 1);
        }
      });

      const topFeatures = Array.from(featureUsage.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([feature]) => feature);

      // Count security alerts
      const securityAlerts = auditLogs?.filter(log => 
        log.event_type === 'security' || log.event_type === 'authentication'
      )?.length || 0;

      return {
        tenantId,
        activeUsers,
        totalSessions: allSessions?.length || 0,
        averageUserEngagement: activeUsers > 0 ? (allSessions?.length || 0) / activeUsers : 0,
        topFeatures,
        securityAlerts,
        performanceMetrics: {
          averageResponseTime: 120, // Mock data - would be calculated from performance logs
          errorRate: 0.02 // Mock data - would be calculated from error logs
        }
      };
    } catch (error) {
      console.error('Failed to get tenant analytics:', error);
      throw error;
    }
  }

  async trackUserAction(
    userId: string,
    tenantId: string,
    action: string,
    resourceType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await auditLogger.logEvent({
        eventType: 'user_action',
        action,
        resourceType,
        details: metadata || {},
        userId,
        tenantId
      });
    } catch (error) {
      console.error('Failed to track user action:', error);
    }
  }
}

export const userAnalyticsService = UserAnalyticsService.getInstance();
