
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '1y';

export interface TenantAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowthRate: number;
  averageSessionDuration: number;
  totalSessions: number;
  performanceMetrics: {
    avgResponseTime: number;
    uptime: number;
  };
  securityAlerts: number;
  averageUserEngagement: number;
  topFeatures: Array<{
    name: string;
    usage: number;
  }>;
}

export interface UserActivityMetric {
  date: string;
  activeUsers: number;
  newUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  actionsPerformed: number;
  loginFrequency: number;
  securityEvents: number;
  lastActivity: string;
  mostUsedFeatures: Array<{
    name: string;
    usage: number;
  }>;
}

export interface UsagePattern {
  feature: string;
  usageCount: number;
  uniqueUsers: number;
  lastUsed: string;
  peakUsageHours: number[];
  growthRate: number;
}

export interface SecurityEvent {
  id: string;
  type: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  correlatedEvents: string[];
  riskScore: number;
  frequency: number;
  timePattern: string;
}

export class UserAnalyticsService {
  private static instance: UserAnalyticsService;

  static getInstance(): UserAnalyticsService {
    if (!UserAnalyticsService.instance) {
      UserAnalyticsService.instance = new UserAnalyticsService();
    }
    return UserAnalyticsService.instance;
  }

  async getTenantAnalytics(tenantId: string, timeRange: AnalyticsTimeRange = '30d'): Promise<TenantAnalytics> {
    // Mock implementation - in production, this would query the database
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[timeRange];
    
    return {
      totalUsers: 142,
      activeUsers: 95,
      newUsers: 12,
      userGrowthRate: 8.5,
      averageSessionDuration: 1200, // 20 minutes in seconds
      totalSessions: 1250,
      performanceMetrics: {
        avgResponseTime: 245,
        uptime: 99.8
      },
      securityAlerts: 3,
      averageUserEngagement: 78,
      topFeatures: [
        { name: 'User Management', usage: 450 },
        { name: 'Role Assignment', usage: 320 },
        { name: 'Permission Review', usage: 180 }
      ]
    };
  }

  async getUserActivityMetrics(tenantId: string, timeRange: AnalyticsTimeRange = '30d'): Promise<UserActivityMetric[]> {
    // Mock implementation - generate sample data
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[timeRange];
    
    const metrics: UserActivityMetric[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      metrics.push({
        date: date.toISOString().split('T')[0],
        activeUsers: Math.floor(Math.random() * 50) + 50,
        newUsers: Math.floor(Math.random() * 10) + 1,
        totalSessions: Math.floor(Math.random() * 200) + 100,
        averageSessionDuration: Math.floor(Math.random() * 600) + 900, // 15-25 minutes
        actionsPerformed: Math.floor(Math.random() * 500) + 200,
        loginFrequency: Math.floor(Math.random() * 20) + 10,
        securityEvents: Math.floor(Math.random() * 5),
        lastActivity: new Date().toISOString(),
        mostUsedFeatures: [
          { name: 'Dashboard', usage: Math.floor(Math.random() * 100) + 50 },
          { name: 'Reports', usage: Math.floor(Math.random() * 80) + 30 }
        ]
      });
    }
    
    return metrics;
  }

  async getUsagePatterns(tenantId: string, timeRange: AnalyticsTimeRange = '30d'): Promise<UsagePattern[]> {
    // Mock implementation
    return [
      {
        feature: 'User Management',
        usageCount: 450,
        uniqueUsers: 25,
        lastUsed: new Date().toISOString(),
        peakUsageHours: [9, 10, 14, 15],
        growthRate: 12.5
      },
      {
        feature: 'Role Assignment',
        usageCount: 320,
        uniqueUsers: 18,
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        peakUsageHours: [10, 11, 16],
        growthRate: 8.2
      },
      {
        feature: 'Permission Review',
        usageCount: 180,
        uniqueUsers: 12,
        lastUsed: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        peakUsageHours: [9, 17],
        growthRate: 15.3
      }
    ];
  }

  async getSecurityEventCorrelation(tenantId: string, timeRange: AnalyticsTimeRange = '30d'): Promise<SecurityEvent[]> {
    // Mock implementation
    return [
      {
        id: 'sec-001',
        type: 'Failed Login Attempt',
        eventType: 'authentication',
        severity: 'medium',
        description: 'Multiple failed login attempts detected',
        userId: 'user-123',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        correlatedEvents: ['sec-002', 'sec-003'],
        riskScore: 65,
        frequency: 5,
        timePattern: 'business_hours'
      },
      {
        id: 'sec-002',
        type: 'Permission Escalation',
        eventType: 'authorization',
        severity: 'high',
        description: 'User attempted to access restricted resource',
        userId: 'user-456',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        ipAddress: '10.0.0.50',
        correlatedEvents: ['sec-001'],
        riskScore: 85,
        frequency: 2,
        timePattern: 'after_hours'
      }
    ];
  }

  async getUserEngagementMetrics(tenantId: string, userId?: string): Promise<any> {
    // Mock implementation for user engagement
    return {
      sessionFrequency: 'daily',
      averageSessionLength: 1200,
      featuresUsed: 8,
      lastActive: new Date().toISOString(),
      engagementScore: 78
    };
  }
}

export const userAnalyticsService = UserAnalyticsService.getInstance();
