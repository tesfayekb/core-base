import { enhancedPermissionResolver, PermissionContext } from './EnhancedPermissionResolver';
import { cacheWarmingService } from './CacheWarmingService';
import { cachePerformanceMonitor } from './CachePerformanceMonitor';
import { PermissionCacheEntry } from './PermissionCache';

export interface PermissionCheckOptions {
  bypassCache?: boolean;
}

export class RBACService {
  private permissionResolver = enhancedPermissionResolver;
  private cacheWarmer = cacheWarmingService;
  private performanceMonitor = cachePerformanceMonitor;

  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    context: PermissionContext = {},
    options: PermissionCheckOptions = {}
  ): Promise<boolean> {
    if (options.bypassCache) {
      // Implement bypass logic if needed, e.g., force refresh
    }
    return this.permissionResolver.resolvePermission(userId, action, resource, context).then(result => result.granted);
  }

  invalidateUserPermissions(userId: string, reason: string): void {
    this.permissionResolver.invalidateUserCache(userId);
    console.log(`Cache invalidation triggered for user ${userId} due to: ${reason}`);
  }

  async warmUpCache(strategyName: string): Promise<void> {
    const result = await this.cacheWarmer.executeWarmingStrategy(strategyName);
    console.log(`Cache warming strategy ${strategyName} completed:`, result);
  }

  getCacheStats(): { permissionCacheSize: number; entityCacheSize: number; hitRate: number; } {
    return this.permissionResolver.getCacheStats();
  }

  getPerformanceReport(): string {
    return this.performanceMonitor.generatePerformanceReport();
  }

  getSystemStatus(): { cacheStats: any; performanceReport: string; warmingStatus: any; alerts: any; } {
    return {
      cacheStats: this.getCacheStats(),
      performanceReport: this.getPerformanceReport(),
      warmingStatus: this.cacheWarmer.getWarmingStatus(),
      alerts: this.performanceMonitor.getActiveAlerts()
    };
  }

  startMonitoring(): void {
    this.performanceMonitor.startMonitoring();
  }

  stopMonitoring(): void {
    this.performanceMonitor.stopMonitoring();
  }

  getActiveAlerts(): any[] {
    return this.performanceMonitor.getActiveAlerts();
  }

  getLastWarmingResults(): any[] {
    return this.cacheWarmer.getLastWarmingResults();
  }

  getAllStrategies(): any[] {
    return this.cacheWarmer.getStrategies();
  }

  generateRecommendations(): { recommendations: string[]; priority: string } {
    const performanceReport = this.performanceMonitor.generatePerformanceReport();
    const cacheStats = this.permissionResolver.getCacheStats();
    
    const recommendations: string[] = [];
    let priority = 'low';

    // Generate recommendations based on performance
    if (cacheStats.hitRate < 0.9) {
      recommendations.push('Consider cache warming for frequently accessed permissions');
      priority = 'high';
    }

    if (performanceReport.includes('exceeded')) {
      recommendations.push('Optimize permission resolution queries');
      priority = 'medium';
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal');
    }

    return { recommendations, priority };
  }

  runDiagnostics(): { status: string; details: any; } {
    const systemStatus = this.getSystemStatus();
    const alerts = this.getActiveAlerts();
    const recommendations = this.generateRecommendations();

    let status = 'healthy';
    if (alerts.length > 0 || recommendations.priority === 'high') {
      status = 'warning';
    }

    return {
      status: status,
      details: {
        systemStatus,
        alerts,
        recommendations
      }
    };
  }
}

export const rbacService = new RBACService();
