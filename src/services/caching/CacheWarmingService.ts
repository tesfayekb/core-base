
// Refactored Cache Warming Service - Uses strategy pattern
// Now much more focused and maintainable

import { phase1Monitor } from '../performance/Phase1Monitor';
import { CacheWarmupStrategy, CacheWarmupResult } from './strategies/CacheWarmupStrategy';
import { UserPermissionsStrategy } from './strategies/UserPermissionsStrategy';
import { TenantConfigurationsStrategy } from './strategies/TenantConfigurationsStrategy';
import { SystemSettingsStrategy } from './strategies/SystemSettingsStrategy';

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private strategies: CacheWarmupStrategy[] = [];

  private constructor() {
    this.registerDefaultStrategies();
  }

  static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService();
    }
    return CacheWarmingService.instance;
  }

  registerStrategy(strategy: CacheWarmupStrategy): void {
    this.strategies.push(strategy);
  }

  private registerDefaultStrategies(): void {
    this.registerStrategy(new UserPermissionsStrategy());
    this.registerStrategy(new TenantConfigurationsStrategy());
    this.registerStrategy(new SystemSettingsStrategy());
  }

  async executeWarmupStrategy(strategyName: string): Promise<CacheWarmupResult> {
    const strategy = this.strategies.find(s => s.name === strategyName);

    if (!strategy) {
      return {
        strategyName: strategyName,
        success: false,
        message: `Strategy "${strategyName}" not found`,
        duration: 0,
        itemsWarmed: 0
      };
    }

    try {
      const result = await strategy.execute();
      phase1Monitor.recordCacheWarmup(
        result.success ? 'complete' : 'error', 
        result.itemsWarmed > 0 ? 95 : 0
      );
      return result;
    } catch (error) {
      return {
        strategyName: strategyName,
        success: false,
        message: `Strategy "${strategyName}" execution failed: ${error.message}`,
        duration: 0,
        itemsWarmed: 0
      };
    }
  }

  async executeAllStrategies(): Promise<CacheWarmupResult[]> {
    const results: CacheWarmupResult[] = [];

    for (const strategy of this.strategies) {
      try {
        const result = await strategy.execute();
        results.push(result);
        phase1Monitor.recordCacheWarmup(
          result.success ? 'complete' : 'error',
          result.itemsWarmed > 0 ? 95 : 0
        );
      } catch (error) {
        results.push({
          strategyName: strategy.name,
          success: false,
          message: `Strategy "${strategy.name}" execution failed: ${error.message}`,
          duration: 0,
          itemsWarmed: 0
        });
      }
    }

    return results;
  }

  getStrategies(): CacheWarmupStrategy[] {
    return [...this.strategies];
  }
}

export const cacheWarmingService = CacheWarmingService.getInstance();

// Re-export types for convenience
export type { CacheWarmupResult, CacheWarmupStrategy } from './strategies/CacheWarmupStrategy';
