
/**
 * Advanced Permission Analytics Service
 * Tracks detailed permission usage patterns, trends, and insights
 * Provides comprehensive analytics for RBAC system optimization
 */

export interface PermissionUsageMetric {
  permissionKey: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  tenantId: string;
  timestamp: number;
  responseTime: number;
  granted: boolean;
  fromCache: boolean;
  sessionId: string;
}

export interface PermissionTrend {
  period: 'hour' | 'day' | 'week' | 'month';
  timestamp: number;
  totalChecks: number;
  grantedChecks: number;
  deniedChecks: number;
  averageResponseTime: number;
  cacheHitRate: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
  topResources: Array<{ resource: string; count: number }>;
}

export interface UserAccessPattern {
  userId: string;
  tenantId: string;
  totalChecks: number;
  grantedRatio: number;
  mostAccessedResources: string[];
  peakUsageHours: number[];
  averageSessionDuration: number;
  lastActivity: number;
}

export interface TenantAnalytics {
  tenantId: string;
  totalUsers: number;
  activeUsers: number;
  totalPermissionChecks: number;
  averageResponseTime: number;
  cacheEfficiency: number;
  mostUsedPermissions: Array<{ permission: string; count: number }>;
  securityInsights: {
    deniedAccessAttempts: number;
    suspiciousPatterns: string[];
    complianceScore: number;
  };
}

export class PermissionAnalyticsService {
  private static instance: PermissionAnalyticsService;
  private usageMetrics: PermissionUsageMetric[] = [];
  private trendData: Map<string, PermissionTrend[]> = new Map();
  private userPatterns: Map<string, UserAccessPattern> = new Map();
  private tenantAnalytics: Map<string, TenantAnalytics> = new Map();

  private readonly MAX_METRICS_HISTORY = 10000;
  private readonly ANALYTICS_BATCH_SIZE = 100;

  static getInstance(): PermissionAnalyticsService {
    if (!PermissionAnalyticsService.instance) {
      PermissionAnalyticsService.instance = new PermissionAnalyticsService();
    }
    return PermissionAnalyticsService.instance;
  }

  /**
   * Records a permission check for analytics tracking
   * Includes comprehensive metadata for detailed analysis
   */
  recordPermissionCheck(metric: Omit<PermissionUsageMetric, 'timestamp' | 'permissionKey'>): void {
    const permissionKey = `${metric.action}:${metric.resource}${metric.resourceId ? `:${metric.resourceId}` : ''}`;
    
    const usageMetric: PermissionUsageMetric = {
      ...metric,
      permissionKey,
      timestamp: Date.now()
    };

    this.usageMetrics.push(usageMetric);

    // Maintain memory efficiency by limiting history
    if (this.usageMetrics.length > this.MAX_METRICS_HISTORY) {
      this.usageMetrics = this.usageMetrics.slice(-this.MAX_METRICS_HISTORY);
    }

    // Update real-time analytics
    this.updateUserPatterns(usageMetric);
    this.updateTenantAnalytics(usageMetric);
  }

  /**
   * Generates comprehensive permission usage trends
   * Analyzes patterns across different time periods
   */
  generateUsageTrends(
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month',
    timeRange?: { start: number; end: number }
  ): PermissionTrend[] {
    const filteredMetrics = this.usageMetrics.filter(metric => {
      const matchesTenant = metric.tenantId === tenantId;
      const withinRange = !timeRange || 
        (metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end);
      return matchesTenant && withinRange;
    });

    return this.aggregateMetricsByPeriod(filteredMetrics, period);
  }

  /**
   * Analyzes user access patterns for security and UX insights
   * Identifies behavioral patterns and potential security concerns
   */
  getUserAccessPatterns(tenantId: string, userId?: string): UserAccessPattern[] {
    const patterns: UserAccessPattern[] = [];
    
    const usersToAnalyze = userId 
      ? [userId] 
      : [...new Set(this.usageMetrics
          .filter(m => m.tenantId === tenantId)
          .map(m => m.userId))];

    for (const targetUserId of usersToAnalyze) {
      const userMetrics = this.usageMetrics.filter(
        m => m.userId === targetUserId && m.tenantId === tenantId
      );

      if (userMetrics.length === 0) continue;

      const pattern: UserAccessPattern = {
        userId: targetUserId,
        tenantId,
        totalChecks: userMetrics.length,
        grantedRatio: userMetrics.filter(m => m.granted).length / userMetrics.length,
        mostAccessedResources: this.getMostAccessedResources(userMetrics),
        peakUsageHours: this.getPeakUsageHours(userMetrics),
        averageSessionDuration: this.calculateAverageSessionDuration(userMetrics),
        lastActivity: Math.max(...userMetrics.map(m => m.timestamp))
      };

      patterns.push(pattern);
    }

    return patterns.sort((a, b) => b.totalChecks - a.totalChecks);
  }

  /**
   * Generates comprehensive tenant-level analytics
   * Provides insights for tenant management and optimization
   */
  getTenantAnalytics(tenantId: string): TenantAnalytics | null {
    const tenantMetrics = this.usageMetrics.filter(m => m.tenantId === tenantId);
    
    if (tenantMetrics.length === 0) return null;

    const uniqueUsers = new Set(tenantMetrics.map(m => m.userId));
    const recentMetrics = tenantMetrics.filter(m => 
      m.timestamp > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    );
    const activeUsers = new Set(recentMetrics.map(m => m.userId));

    const deniedAttempts = tenantMetrics.filter(m => !m.granted);
    const suspiciousPatterns = this.detectSuspiciousPatterns(tenantMetrics);

    return {
      tenantId,
      totalUsers: uniqueUsers.size,
      activeUsers: activeUsers.size,
      totalPermissionChecks: tenantMetrics.length,
      averageResponseTime: tenantMetrics.reduce((sum, m) => sum + m.responseTime, 0) / tenantMetrics.length,
      cacheEfficiency: tenantMetrics.filter(m => m.fromCache).length / tenantMetrics.length,
      mostUsedPermissions: this.getMostUsedPermissions(tenantMetrics),
      securityInsights: {
        deniedAccessAttempts: deniedAttempts.length,
        suspiciousPatterns,
        complianceScore: this.calculateComplianceScore(tenantMetrics)
      }
    };
  }

  /**
   * Generates actionable insights for RBAC optimization
   * Provides recommendations based on usage patterns
   */
  generateOptimizationInsights(tenantId: string): {
    cacheOptimization: string[];
    permissionOptimization: string[];
    securityRecommendations: string[];
    performanceRecommendations: string[];
  } {
    const tenantMetrics = this.usageMetrics.filter(m => m.tenantId === tenantId);
    const analytics = this.getTenantAnalytics(tenantId);
    
    if (!analytics) {
      return {
        cacheOptimization: ['Insufficient data for cache optimization recommendations'],
        permissionOptimization: ['Insufficient data for permission optimization recommendations'],
        securityRecommendations: ['Insufficient data for security recommendations'],
        performanceRecommendations: ['Insufficient data for performance recommendations']
      };
    }

    return {
      cacheOptimization: this.generateCacheOptimizationInsights(tenantMetrics, analytics),
      permissionOptimization: this.generatePermissionOptimizationInsights(tenantMetrics, analytics),
      securityRecommendations: this.generateSecurityRecommendations(tenantMetrics, analytics),
      performanceRecommendations: this.generatePerformanceRecommendations(tenantMetrics, analytics)
    };
  }

  // Private helper methods for analytics calculations

  private updateUserPatterns(metric: PermissionUsageMetric): void {
    const key = `${metric.userId}:${metric.tenantId}`;
    const existing = this.userPatterns.get(key);
    
    // Implementation would update user patterns in real-time
    // This is a placeholder for the pattern update logic
  }

  private updateTenantAnalytics(metric: PermissionUsageMetric): void {
    const existing = this.tenantAnalytics.get(metric.tenantId);
    
    // Implementation would update tenant analytics in real-time
    // This is a placeholder for the analytics update logic
  }

  private aggregateMetricsByPeriod(metrics: PermissionUsageMetric[], period: string): PermissionTrend[] {
    // Group metrics by time period and aggregate statistics
    const groups = new Map<number, PermissionUsageMetric[]>();
    
    for (const metric of metrics) {
      const periodKey = this.getPeriodKey(metric.timestamp, period as any);
      if (!groups.has(periodKey)) {
        groups.set(periodKey, []);
      }
      groups.get(periodKey)!.push(metric);
    }

    return Array.from(groups.entries()).map(([timestamp, periodMetrics]) => ({
      period: period as any,
      timestamp,
      totalChecks: periodMetrics.length,
      grantedChecks: periodMetrics.filter(m => m.granted).length,
      deniedChecks: periodMetrics.filter(m => !m.granted).length,
      averageResponseTime: periodMetrics.reduce((sum, m) => sum + m.responseTime, 0) / periodMetrics.length,
      cacheHitRate: periodMetrics.filter(m => m.fromCache).length / periodMetrics.length,
      uniqueUsers: new Set(periodMetrics.map(m => m.userId)).size,
      topActions: this.getTopActions(periodMetrics),
      topResources: this.getTopResources(periodMetrics)
    }));
  }

  private getPeriodKey(timestamp: number, period: 'hour' | 'day' | 'week' | 'month'): number {
    const date = new Date(timestamp);
    switch (period) {
      case 'hour':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
      case 'day':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
      case 'month':
        return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      default:
        return timestamp;
    }
  }

  private getMostAccessedResources(metrics: PermissionUsageMetric[]): string[] {
    const resourceCounts = new Map<string, number>();
    
    for (const metric of metrics) {
      const resource = metric.resource;
      resourceCounts.set(resource, (resourceCounts.get(resource) || 0) + 1);
    }

    return Array.from(resourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([resource]) => resource);
  }

  private getPeakUsageHours(metrics: PermissionUsageMetric[]): number[] {
    const hourCounts = new Map<number, number>();
    
    for (const metric of metrics) {
      const hour = new Date(metric.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);
  }

  private calculateAverageSessionDuration(metrics: PermissionUsageMetric[]): number {
    // Group by session and calculate duration
    const sessions = new Map<string, number[]>();
    
    for (const metric of metrics) {
      if (!sessions.has(metric.sessionId)) {
        sessions.set(metric.sessionId, []);
      }
      sessions.get(metric.sessionId)!.push(metric.timestamp);
    }

    let totalDuration = 0;
    let sessionCount = 0;

    for (const timestamps of sessions.values()) {
      if (timestamps.length > 1) {
        const duration = Math.max(...timestamps) - Math.min(...timestamps);
        totalDuration += duration;
        sessionCount++;
      }
    }

    return sessionCount > 0 ? totalDuration / sessionCount : 0;
  }

  private getMostUsedPermissions(metrics: PermissionUsageMetric[]): Array<{ permission: string; count: number }> {
    const permissionCounts = new Map<string, number>();
    
    for (const metric of metrics) {
      const permission = metric.permissionKey;
      permissionCounts.set(permission, (permissionCounts.get(permission) || 0) + 1);
    }

    return Array.from(permissionCounts.entries())
      .map(([permission, count]) => ({ permission, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private detectSuspiciousPatterns(metrics: PermissionUsageMetric[]): string[] {
    const patterns: string[] = [];
    
    // Check for excessive denied attempts
    const deniedAttempts = metrics.filter(m => !m.granted);
    const deniedRatio = deniedAttempts.length / metrics.length;
    
    if (deniedRatio > 0.3) {
      patterns.push(`High denial rate: ${(deniedRatio * 100).toFixed(1)}%`);
    }

    // Check for unusual access patterns
    const resourceAccess = new Map<string, Set<string>>();
    for (const metric of metrics) {
      if (!resourceAccess.has(metric.resource)) {
        resourceAccess.set(metric.resource, new Set());
      }
      resourceAccess.get(metric.resource)!.add(metric.userId);
    }

    // More sophisticated pattern detection would be implemented here

    return patterns;
  }

  private calculateComplianceScore(metrics: PermissionUsageMetric[]): number {
    // Calculate compliance score based on various factors
    const totalChecks = metrics.length;
    const grantedChecks = metrics.filter(m => m.granted).length;
    const cacheHits = metrics.filter(m => m.fromCache).length;
    
    const accessScore = (grantedChecks / totalChecks) * 50;
    const performanceScore = (cacheHits / totalChecks) * 30;
    const securityScore = 20; // Base security score
    
    return Math.min(100, accessScore + performanceScore + securityScore);
  }

  private getTopActions(metrics: PermissionUsageMetric[]): Array<{ action: string; count: number }> {
    const actionCounts = new Map<string, number>();
    
    for (const metric of metrics) {
      actionCounts.set(metric.action, (actionCounts.get(metric.action) || 0) + 1);
    }

    return Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getTopResources(metrics: PermissionUsageMetric[]): Array<{ resource: string; count: number }> {
    const resourceCounts = new Map<string, number>();
    
    for (const metric of metrics) {
      resourceCounts.set(metric.resource, (resourceCounts.get(metric.resource) || 0) + 1);
    }

    return Array.from(resourceCounts.entries())
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private generateCacheOptimizationInsights(metrics: PermissionUsageMetric[], analytics: TenantAnalytics): string[] {
    const insights: string[] = [];
    
    if (analytics.cacheEfficiency < 0.9) {
      insights.push('Cache efficiency below 90% - consider increasing cache TTL for frequently accessed permissions');
    }
    
    if (analytics.averageResponseTime > 10) {
      insights.push('Response times above target - implement cache warming for critical permissions');
    }

    return insights;
  }

  private generatePermissionOptimizationInsights(metrics: PermissionUsageMetric[], analytics: TenantAnalytics): string[] {
    const insights: string[] = [];
    
    const topPermissions = analytics.mostUsedPermissions.slice(0, 3);
    if (topPermissions.length > 0) {
      insights.push(`Top permissions (${topPermissions.map(p => p.permission).join(', ')}) account for high usage - ensure optimal caching`);
    }

    return insights;
  }

  private generateSecurityRecommendations(metrics: PermissionUsageMetric[], analytics: TenantAnalytics): string[] {
    const recommendations: string[] = [];
    
    if (analytics.securityInsights.deniedAccessAttempts > 100) {
      recommendations.push('High number of denied access attempts detected - review user permissions');
    }
    
    if (analytics.securityInsights.complianceScore < 80) {
      recommendations.push('Compliance score below 80% - audit permission assignments');
    }

    return recommendations;
  }

  private generatePerformanceRecommendations(metrics: PermissionUsageMetric[], analytics: TenantAnalytics): string[] {
    const recommendations: string[] = [];
    
    if (analytics.averageResponseTime > 15) {
      recommendations.push('Average response time exceeds 15ms target - optimize permission resolution');
    }
    
    if (analytics.cacheEfficiency < 0.95) {
      recommendations.push('Cache hit rate below 95% - review cache sizing and TTL settings');
    }

    return recommendations;
  }
}

export const permissionAnalyticsService = PermissionAnalyticsService.getInstance();
