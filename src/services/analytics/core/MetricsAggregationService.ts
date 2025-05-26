
// Metrics Aggregation Service - Focused on calculations
import { UserActivityMetric, SecurityEvent } from '../UserAnalyticsService';

export interface AggregatedMetrics {
  averageSessionDuration: number;
  totalActions: number;
  securityScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  trendDirection: 'up' | 'down' | 'stable';
}

export class MetricsAggregationService {
  private static instance: MetricsAggregationService;

  static getInstance(): MetricsAggregationService {
    if (!MetricsAggregationService.instance) {
      MetricsAggregationService.instance = new MetricsAggregationService();
    }
    return MetricsAggregationService.instance;
  }

  aggregateUserMetrics(metrics: UserActivityMetric[]): AggregatedMetrics {
    if (!metrics.length) {
      return this.getDefaultMetrics();
    }

    const totalSessions = metrics.reduce((sum, m) => sum + m.totalSessions, 0);
    const totalDuration = metrics.reduce((sum, m) => sum + (m.averageSessionDuration * m.totalSessions), 0);
    const totalActions = metrics.reduce((sum, m) => sum + m.actionsPerformed, 0);
    
    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const engagementLevel = this.calculateEngagementLevel(averageSessionDuration, totalActions);
    const trendDirection = this.calculateTrend(metrics);

    return {
      averageSessionDuration,
      totalActions,
      securityScore: this.calculateSecurityScore(metrics),
      engagementLevel,
      trendDirection
    };
  }

  aggregateSecurityEvents(events: SecurityEvent[]): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    eventsByType: Record<string, number>;
    timePatterns: Record<string, number>;
  } {
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timePatterns = events.reduce((acc, event) => {
      acc[event.timePattern] = (acc[event.timePattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const riskLevel = this.calculateRiskLevel(events);

    return {
      riskLevel,
      eventsByType,
      timePatterns
    };
  }

  private getDefaultMetrics(): AggregatedMetrics {
    return {
      averageSessionDuration: 0,
      totalActions: 0,
      securityScore: 100,
      engagementLevel: 'low',
      trendDirection: 'stable'
    };
  }

  private calculateEngagementLevel(duration: number, actions: number): 'low' | 'medium' | 'high' {
    const score = (duration / 1000) + (actions / 10);
    if (score > 200) return 'high';
    if (score > 100) return 'medium';
    return 'low';
  }

  private calculateTrend(metrics: UserActivityMetric[]): 'up' | 'down' | 'stable' {
    if (metrics.length < 2) return 'stable';
    
    const recent = metrics.slice(-7);
    const older = metrics.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.activeUsers, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.activeUsers, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'up';
    if (change < -0.05) return 'down';
    return 'stable';
  }

  private calculateSecurityScore(metrics: UserActivityMetric[]): number {
    const totalEvents = metrics.reduce((sum, m) => sum + m.securityEvents, 0);
    const totalSessions = metrics.reduce((sum, m) => sum + m.totalSessions, 0);
    
    if (totalSessions === 0) return 100;
    
    const riskRatio = totalEvents / totalSessions;
    return Math.max(0, 100 - (riskRatio * 100));
  }

  private calculateRiskLevel(events: SecurityEvent[]): 'low' | 'medium' | 'high' | 'critical' {
    if (!events.length) return 'low';
    
    const avgRiskScore = events.reduce((sum, e) => sum + e.riskScore, 0) / events.length;
    const criticalEvents = events.filter(e => e.severity === 'critical').length;
    
    if (criticalEvents > 0 || avgRiskScore > 80) return 'critical';
    if (avgRiskScore > 60) return 'high';
    if (avgRiskScore > 30) return 'medium';
    return 'low';
  }
}

export const metricsAggregationService = MetricsAggregationService.getInstance();
