
// Cache Warming Service - Phase 2.1 Implementation
// Pre-loads common permissions to achieve >95% cache hit rate

import { enhancedPermissionResolver } from './EnhancedPermissionResolver';
import { advancedCacheManager } from './AdvancedCacheManager';
import { rbacService } from './rbacService';

export interface WarmingStrategy {
  name: string;
  description: string;
  priority: number;
  execute: () => Promise<WarmingResult>;
}

export interface WarmingResult {
  strategy: string;
  itemsWarmed: number;
  duration: number;
  success: boolean;
  errors: string[];
}

export interface WarmingSchedule {
  enabled: boolean;
  intervalMinutes: number;
  strategies: string[];
}

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private strategies: Map<string, WarmingStrategy> = new Map();
  private warmingTimer?: NodeJS.Timeout;
  private isWarming = false;
  private lastWarmingResults: WarmingResult[] = [];

  // Common permission patterns to warm
  private readonly COMMON_PERMISSIONS = [
    { action: 'view', resource: 'users' },
    { action: 'view', resource: 'documents' },
    { action: 'view', resource: 'settings' },
    { action: 'view', resource: 'roles' },
    { action: 'view', resource: 'audit' },
    { action: 'create', resource: 'documents' },
    { action: 'update', resource: 'documents' },
    { action: 'manage', resource: 'users' },
    { action: 'assign', resource: 'roles' }
  ];

  static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService();
      CacheWarmingService.instance.initializeDefaultStrategies();
    }
    return CacheWarmingService.instance;
  }

  private initializeDefaultStrategies(): void {
    // Strategy 1: Common Permissions
    this.registerStrategy({
      name: 'common_permissions',
      description: 'Warm common permission patterns for active users',
      priority: 1,
      execute: () => this.warmCommonPermissions()
    });

    // Strategy 2: Recently Active Users
    this.registerStrategy({
      name: 'active_users',
      description: 'Warm permissions for recently active users',
      priority: 2,
      execute: () => this.warmActiveUserPermissions()
    });

    // Strategy 3: Role-Based Warming
    this.registerStrategy({
      name: 'role_based',
      description: 'Warm permissions based on role assignments',
      priority: 3,
      execute: () => this.warmRoleBasedPermissions()
    });
  }

  registerStrategy(strategy: WarmingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  async executeWarmingStrategy(strategyName: string): Promise<WarmingResult> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      return {
        strategy: strategyName,
        itemsWarmed: 0,
        duration: 0,
        success: false,
        errors: [`Strategy '${strategyName}' not found`]
      };
    }

    console.log(`Executing cache warming strategy: ${strategy.name}`);
    const startTime = Date.now();

    try {
      const result = await strategy.execute();
      const duration = Date.now() - startTime;
      
      return {
        ...result,
        duration
      };
    } catch (error) {
      return {
        strategy: strategyName,
        itemsWarmed: 0,
        duration: Date.now() - startTime,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async executeAllStrategies(): Promise<WarmingResult[]> {
    if (this.isWarming) {
      console.log('Cache warming already in progress');
      return this.lastWarmingResults;
    }

    this.isWarming = true;
    const results: WarmingResult[] = [];

    try {
      // Sort strategies by priority
      const sortedStrategies = Array.from(this.strategies.values())
        .sort((a, b) => a.priority - b.priority);

      for (const strategy of sortedStrategies) {
        const result = await this.executeWarmingStrategy(strategy.name);
        results.push(result);
        
        // Small delay between strategies to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.lastWarmingResults = results;
      console.log('Cache warming completed:', results);

    } finally {
      this.isWarming = false;
    }

    return results;
  }

  private async warmCommonPermissions(): Promise<WarmingResult> {
    const activeUserIds = await this.getActiveUserIds();
    let itemsWarmed = 0;
    const errors: string[] = [];

    for (const userId of activeUserIds) {
      for (const permission of this.COMMON_PERMISSIONS) {
        try {
          await enhancedPermissionResolver.resolvePermission(
            userId,
            permission.action,
            permission.resource
          );
          itemsWarmed++;
        } catch (error) {
          errors.push(`Failed to warm ${permission.action}:${permission.resource} for user ${userId}`);
        }
      }
    }

    return {
      strategy: 'common_permissions',
      itemsWarmed,
      duration: 0, // Will be set by caller
      success: errors.length === 0,
      errors
    };
  }

  private async warmActiveUserPermissions(): Promise<WarmingResult> {
    const activeUserIds = await this.getActiveUserIds();
    let itemsWarmed = 0;
    const errors: string[] = [];

    for (const userId of activeUserIds.slice(0, 50)) { // Limit to top 50 active users
      try {
        const userPermissions = await rbacService.getUserPermissions(userId);
        
        for (const permission of userPermissions) {
          await enhancedPermissionResolver.resolvePermission(
            userId,
            permission.action,
            permission.resource
          );
          itemsWarmed++;
        }
      } catch (error) {
        errors.push(`Failed to warm permissions for user ${userId}`);
      }
    }

    return {
      strategy: 'active_users',
      itemsWarmed,
      duration: 0,
      success: errors.length === 0,
      errors
    };
  }

  private async warmRoleBasedPermissions(): Promise<WarmingResult> {
    let itemsWarmed = 0;
    const errors: string[] = [];

    try {
      // This would typically query for common role-permission combinations
      // For now, simulate warming based on common role patterns
      const rolePatterns = [
        { role: 'admin', permissions: this.COMMON_PERMISSIONS },
        { role: 'manager', permissions: this.COMMON_PERMISSIONS.slice(0, 6) },
        { role: 'user', permissions: this.COMMON_PERMISSIONS.slice(0, 3) }
      ];

      const userIds = await this.getActiveUserIds();

      for (const pattern of rolePatterns) {
        for (const userId of userIds.slice(0, 10)) { // Sample users
          for (const permission of pattern.permissions) {
            try {
              await enhancedPermissionResolver.resolvePermission(
                userId,
                permission.action,
                permission.resource
              );
              itemsWarmed++;
            } catch (error) {
              errors.push(`Failed to warm role-based permission for ${userId}`);
            }
          }
        }
      }
    } catch (error) {
      errors.push('Failed to execute role-based warming');
    }

    return {
      strategy: 'role_based',
      itemsWarmed,
      duration: 0,
      success: errors.length === 0,
      errors
    };
  }

  private async getActiveUserIds(): Promise<string[]> {
    // In a real implementation, this would query for recently active users
    // For now, return simulated user IDs
    return [
      'user1', 'user2', 'user3', 'user4', 'user5',
      'admin1', 'manager1', 'viewer1'
    ];
  }

  startScheduledWarming(schedule: WarmingSchedule): void {
    if (!schedule.enabled) {
      this.stopScheduledWarming();
      return;
    }

    this.stopScheduledWarming(); // Clear any existing timer

    const intervalMs = schedule.intervalMinutes * 60 * 1000;
    
    this.warmingTimer = setInterval(async () => {
      console.log('Executing scheduled cache warming...');
      
      if (schedule.strategies.length === 0) {
        await this.executeAllStrategies();
      } else {
        const results: WarmingResult[] = [];
        for (const strategyName of schedule.strategies) {
          const result = await this.executeWarmingStrategy(strategyName);
          results.push(result);
        }
        this.lastWarmingResults = results;
      }
    }, intervalMs);

    console.log(`Scheduled cache warming started (every ${schedule.intervalMinutes} minutes)`);
  }

  stopScheduledWarming(): void {
    if (this.warmingTimer) {
      clearInterval(this.warmingTimer);
      this.warmingTimer = undefined;
      console.log('Scheduled cache warming stopped');
    }
  }

  getLastWarmingResults(): WarmingResult[] {
    return this.lastWarmingResults;
  }

  getWarmingStatus(): {
    isWarming: boolean;
    lastWarmingTime: number | null;
    scheduledWarmingActive: boolean;
    totalItemsWarmed: number;
  } {
    const lastWarmingTime = this.lastWarmingResults.length > 0 
      ? Date.now() // Approximate since we don't track exact timing
      : null;

    const totalItemsWarmed = this.lastWarmingResults.reduce(
      (sum, result) => sum + result.itemsWarmed, 
      0
    );

    return {
      isWarming: this.isWarming,
      lastWarmingTime,
      scheduledWarmingActive: !!this.warmingTimer,
      totalItemsWarmed
    };
  }
}

export const cacheWarmingService = CacheWarmingService.getInstance();
