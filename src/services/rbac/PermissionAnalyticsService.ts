
// Permission Analytics Service
// Version: 1.0.0 - Advanced Permission Usage Analytics

export interface PermissionUsageMetrics {
  permissionKey: string;
  usageCount: number;
  lastUsed: Date;
  averageResponseTime: number;
  successRate: number;
}

export interface UserActivityMetrics {
  userId: string;
  totalPermissionChecks: number;
  uniquePermissionsUsed: number;
  failedPermissionAttempts: number;
  lastActivity: Date;
}

export interface TenantAnalytics {
  tenantId: string;
  totalUsers: number;
  activeUsers: number;
  permissionChecksPerDay: number;
  mostUsedPermissions: string[];
  securityEvents: number;
}

export class PermissionAnalyticsService {
  private static instance: PermissionAnalyticsService;
  private usageMetrics = new Map<string, PermissionUsageMetrics>();
  private userMetrics = new Map<string, UserActivityMetrics>();

  static getInstance(): PermissionAnalyticsService {
    if (!PermissionAnalyticsService.instance) {
      PermissionAnalyticsService.instance = new PermissionAnalyticsService();
    }
    return PermissionAnalyticsService.instance;
  }

  recordPermissionCheck(
    userId: string,
    permissionKey: string,
    responseTime: number,
    success: boolean
  ): void {
    // Record permission usage
    const existing = this.usageMetrics.get(permissionKey) || {
      permissionKey,
      usageCount: 0,
      lastUsed: new Date(),
      averageResponseTime: 0,
      successRate: 0
    };

    existing.usageCount++;
    existing.lastUsed = new Date();
    existing.averageResponseTime = (existing.averageResponseTime + responseTime) / 2;
    existing.successRate = success ? Math.min(1, existing.successRate + 0.1) : Math.max(0, existing.successRate - 0.1);
    
    this.usageMetrics.set(permissionKey, existing);

    // Record user activity
    const userMetric = this.userMetrics.get(userId) || {
      userId,
      totalPermissionChecks: 0,
      uniquePermissionsUsed: 0,
      failedPermissionAttempts: 0,
      lastActivity: new Date()
    };

    userMetric.totalPermissionChecks++;
    userMetric.lastActivity = new Date();
    if (!success) {
      userMetric.failedPermissionAttempts++;
    }

    this.userMetrics.set(userId, userMetric);
  }

  getPermissionUsageMetrics(permissionKey?: string): PermissionUsageMetrics[] {
    if (permissionKey) {
      const metric = this.usageMetrics.get(permissionKey);
      return metric ? [metric] : [];
    }
    return Array.from(this.usageMetrics.values());
  }

  getUserActivityMetrics(userId?: string): UserActivityMetrics[] {
    if (userId) {
      const metric = this.userMetrics.get(userId);
      return metric ? [metric] : [];
    }
    return Array.from(this.userMetrics.values());
  }

  getTenantAnalytics(tenantId: string): TenantAnalytics {
    const tenantUsers = Array.from(this.userMetrics.values())
      .filter(user => user.userId.includes(tenantId)); // Simple tenant filtering

    const totalChecks = tenantUsers.reduce((sum, user) => sum + user.totalPermissionChecks, 0);
    const activeUsers = tenantUsers.filter(user => 
      Date.now() - user.lastActivity.getTime() < 24 * 60 * 60 * 1000
    ).length;

    const permissionUsage = Array.from(this.usageMetrics.entries())
      .sort(([, a], [, b]) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(([key]) => key);

    return {
      tenantId,
      totalUsers: tenantUsers.length,
      activeUsers,
      permissionChecksPerDay: totalChecks,
      mostUsedPermissions: permissionUsage,
      securityEvents: tenantUsers.reduce((sum, user) => sum + user.failedPermissionAttempts, 0)
    };
  }

  generateAnalyticsReport(): {
    summary: {
      totalPermissionChecks: number;
      totalUsers: number;
      averageResponseTime: number;
      successRate: number;
    };
    topPermissions: PermissionUsageMetrics[];
    activeUsers: UserActivityMetrics[];
  } {
    const allMetrics = Array.from(this.usageMetrics.values());
    const allUsers = Array.from(this.userMetrics.values());

    const totalChecks = allMetrics.reduce((sum, metric) => sum + metric.usageCount, 0);
    const avgResponseTime = allMetrics.reduce((sum, metric) => sum + metric.averageResponseTime, 0) / allMetrics.length || 0;
    const avgSuccessRate = allMetrics.reduce((sum, metric) => sum + metric.successRate, 0) / allMetrics.length || 0;

    return {
      summary: {
        totalPermissionChecks: totalChecks,
        totalUsers: allUsers.length,
        averageResponseTime: avgResponseTime,
        successRate: avgSuccessRate
      },
      topPermissions: allMetrics
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10),
      activeUsers: allUsers
        .filter(user => Date.now() - user.lastActivity.getTime() < 24 * 60 * 60 * 1000)
        .sort((a, b) => b.totalPermissionChecks - a.totalPermissionChecks)
        .slice(0, 10)
    };
  }
}

export const permissionAnalyticsService = PermissionAnalyticsService.getInstance();
