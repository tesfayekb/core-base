
// Cache Warming Service
// Sophisticated cache warming strategies for optimal performance

import { phase1Monitor } from '../performance/Phase1Monitor';

export interface WarmupStrategy {
  name: string;
  priority: number;
  estimatedTime: number;
  dependencies: string[];
}

export interface WarmupResult {
  strategy: string;
  success: boolean;
  duration: number;
  itemsWarmed: number;
  errors: string[];
}

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private warmupStrategies = new Map<string, WarmupStrategy>();
  private isWarming = false;
  private warmupResults: WarmupResult[] = [];

  static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService();
    }
    return CacheWarmingService.instance;
  }

  private constructor() {
    this.initializeWarmupStrategies();
  }

  private initializeWarmupStrategies(): void {
    // User permission cache warming
    this.warmupStrategies.set('user-permissions', {
      name: 'User Permissions Cache',
      priority: 1,
      estimatedTime: 2000,
      dependencies: []
    });

    // Role cache warming
    this.warmupStrategies.set('roles', {
      name: 'Roles Cache',
      priority: 2,
      estimatedTime: 1000,
      dependencies: []
    });

    // Tenant context cache warming
    this.warmupStrategies.set('tenant-context', {
      name: 'Tenant Context Cache',
      priority: 3,
      estimatedTime: 1500,
      dependencies: ['user-permissions']
    });

    // Permission dependencies cache warming
    this.warmupStrategies.set('permission-dependencies', {
      name: 'Permission Dependencies Cache',
      priority: 4,
      estimatedTime: 800,
      dependencies: ['user-permissions', 'roles']
    });

    // Frequently accessed resources
    this.warmupStrategies.set('hot-resources', {
      name: 'Hot Resources Cache',
      priority: 5,
      estimatedTime: 3000,
      dependencies: ['user-permissions', 'tenant-context']
    });
  }

  async executeWarmupStrategy(strategyName: string): Promise<WarmupResult> {
    const strategy = this.warmupStrategies.get(strategyName);
    if (!strategy) {
      return {
        strategy: strategyName,
        success: false,
        duration: 0,
        itemsWarmed: 0,
        errors: [`Strategy '${strategyName}' not found`]
      };
    }

    const startTime = performance.now();
    const errors: string[] = [];
    let itemsWarmed = 0;

    try {
      console.log(`🔥 Starting cache warming: ${strategy.name}`);

      switch (strategyName) {
        case 'user-permissions':
          itemsWarmed = await this.warmUserPermissions();
          break;
        case 'roles':
          itemsWarmed = await this.warmRoles();
          break;
        case 'tenant-context':
          itemsWarmed = await this.warmTenantContext();
          break;
        case 'permission-dependencies':
          itemsWarmed = await this.warmPermissionDependencies();
          break;
        case 'hot-resources':
          itemsWarmed = await this.warmHotResources();
          break;
        default:
          errors.push(`Unknown strategy: ${strategyName}`);
      }

      const duration = performance.now() - startTime;
      console.log(`✅ Cache warming completed: ${strategy.name} (${itemsWarmed} items, ${duration.toFixed(2)}ms)`);

      return {
        strategy: strategyName,
        success: errors.length === 0,
        duration,
        itemsWarmed,
        errors
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      console.error(`❌ Cache warming failed: ${strategy.name} - ${errorMessage}`);

      return {
        strategy: strategyName,
        success: false,
        duration,
        itemsWarmed,
        errors
      };
    }
  }

  async warmAllCaches(): Promise<WarmupResult[]> {
    if (this.isWarming) {
      throw new Error('Cache warming already in progress');
    }

    this.isWarming = true;
    this.warmupResults = [];

    try {
      console.log('🚀 Starting comprehensive cache warming...');
      
      // Sort strategies by priority and dependencies
      const sortedStrategies = this.getSortedStrategies();
      
      for (const strategyName of sortedStrategies) {
        const result = await this.executeWarmupStrategy(strategyName);
        this.warmupResults.push(result);
        
        // Record warmup metrics
        phase1Monitor.recordCacheWarmup(result.duration, result.itemsWarmed);
      }

      const totalItems = this.warmupResults.reduce((sum, r) => sum + r.itemsWarmed, 0);
      const totalTime = this.warmupResults.reduce((sum, r) => sum + r.duration, 0);
      
      console.log(`🎉 Cache warming completed: ${totalItems} items warmed in ${totalTime.toFixed(2)}ms`);
      
      return this.warmupResults;

    } finally {
      this.isWarming = false;
    }
  }

  private getSortedStrategies(): string[] {
    const strategies = Array.from(this.warmupStrategies.entries());
    const sorted: string[] = [];
    const processed = new Set<string>();

    // Topological sort based on dependencies
    const visit = (strategyName: string) => {
      if (processed.has(strategyName)) return;
      
      const strategy = this.warmupStrategies.get(strategyName);
      if (!strategy) return;

      // Process dependencies first
      for (const dep of strategy.dependencies) {
        visit(dep);
      }

      processed.add(strategyName);
      sorted.push(strategyName);
    };

    // Sort by priority first, then process dependencies
    strategies
      .sort(([, a], [, b]) => a.priority - b.priority)
      .forEach(([name]) => visit(name));

    return sorted;
  }

  private async warmUserPermissions(): Promise<number> {
    // Simulate warming user permissions cache
    // In real implementation, this would pre-load frequently accessed user permissions
    await new Promise(resolve => setTimeout(resolve, 100));
    return 25; // Simulated count of warmed user permissions
  }

  private async warmRoles(): Promise<number> {
    // Simulate warming roles cache
    await new Promise(resolve => setTimeout(resolve, 50));
    return 8; // Simulated count of warmed roles
  }

  private async warmTenantContext(): Promise<number> {
    // Simulate warming tenant context cache
    await new Promise(resolve => setTimeout(resolve, 75));
    return 5; // Simulated count of warmed tenant contexts
  }

  private async warmPermissionDependencies(): Promise<number> {
    // Simulate warming permission dependencies cache
    await new Promise(resolve => setTimeout(resolve, 40));
    return 15; // Simulated count of warmed permission dependencies
  }

  private async warmHotResources(): Promise<number> {
    // Simulate warming frequently accessed resources
    await new Promise(resolve => setTimeout(resolve, 150));
    return 50; // Simulated count of warmed hot resources
  }

  getWarmupMetrics(): {
    isWarming: boolean;
    lastWarmupResults: WarmupResult[];
    totalStrategies: number;
    averageWarmupTime: number;
  } {
    const averageWarmupTime = this.warmupResults.length > 0
      ? this.warmupResults.reduce((sum, r) => sum + r.duration, 0) / this.warmupResults.length
      : 0;

    return {
      isWarming: this.isWarming,
      lastWarmupResults: this.warmupResults,
      totalStrategies: this.warmupStrategies.size,
      averageWarmupTime
    };
  }
}

export const cacheWarmingService = CacheWarmingService.getInstance();
