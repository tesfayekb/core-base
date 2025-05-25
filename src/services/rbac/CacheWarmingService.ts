
// Cache Warming Service - Refactored
import { WarmingStrategy, WarmingResult, WarmingSchedule } from './warming/WarmingTypes';
import { CommonPermissionsStrategy } from './warming/strategies/CommonPermissionsStrategy';

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private strategies: WarmingStrategy[] = [];
  private warmingTimer?: NodeJS.Timeout;
  private isWarming = false;
  private lastWarmingResults: WarmingResult[] = [];

  private constructor() {
    this.registerDefaultStrategies();
  }

  static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService();
    }
    return CacheWarmingService.instance;
  }

  private registerDefaultStrategies(): void {
    this.strategies.push(new CommonPermissionsStrategy());
  }

  async executeWarmingStrategy(strategyName: string): Promise<WarmingResult> {
    const strategy = this.strategies.find(s => s.name === strategyName);
    if (!strategy) {
      return {
        strategy: strategyName,
        success: false,
        errors: [`Strategy "${strategyName}" not found`],
        duration: 0,
        itemsWarmed: 0
      };
    }

    try {
      return await strategy.execute();
    } catch (error) {
      return {
        strategy: strategyName,
        success: false,
        errors: [`Strategy execution failed: ${error.message}`],
        duration: 0,
        itemsWarmed: 0
      };
    }
  }

  async executeAllStrategies(): Promise<WarmingResult[]> {
    if (this.isWarming) {
      return this.lastWarmingResults;
    }

    this.isWarming = true;
    const results: WarmingResult[] = [];

    try {
      const sortedStrategies = this.strategies.sort((a, b) => a.priority - b.priority);

      for (const strategy of sortedStrategies) {
        const result = await this.executeWarmingStrategy(strategy.name);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.lastWarmingResults = results;
    } finally {
      this.isWarming = false;
    }

    return results;
  }

  startScheduledWarming(schedule: WarmingSchedule): void {
    if (!schedule.enabled) return;

    if (this.warmingTimer) {
      clearInterval(this.warmingTimer);
    }

    this.warmingTimer = setInterval(() => {
      this.executeAllStrategies();
    }, schedule.intervalMinutes * 60 * 1000);
  }

  stopScheduledWarming(): void {
    if (this.warmingTimer) {
      clearInterval(this.warmingTimer);
      this.warmingTimer = undefined;
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
    const totalItemsWarmed = this.lastWarmingResults.reduce(
      (sum, result) => sum + result.itemsWarmed, 
      0
    );

    return {
      isWarming: this.isWarming,
      lastWarmingTime: this.lastWarmingResults.length > 0 ? Date.now() : null,
      scheduledWarmingActive: !!this.warmingTimer,
      totalItemsWarmed
    };
  }
}

export const cacheWarmingService = CacheWarmingService.getInstance();
export type { WarmingResult, WarmingStrategy, WarmingSchedule };
