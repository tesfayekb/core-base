
// Cache Warming Service - Refactored with memory management
import { WarmingStrategy, WarmingResult, WarmingSchedule } from './warming/WarmingTypes';
import { CommonPermissionsStrategy } from './warming/strategies/CommonPermissionsStrategy';
import { cacheMemoryMonitor } from './caching/CacheMemoryMonitor';

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private strategies: WarmingStrategy[] = [];
  private warmingTimer?: NodeJS.Timeout;
  private isWarming = false;
  private lastWarmingResults: WarmingResult[] = [];
  private readonly maxWarmingResults = 50; // Limit history size

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

  async executeWarmupStrategy(strategyName: string): Promise<WarmingResult> {
    // Check memory pressure before warming
    if (cacheMemoryMonitor.isMemoryPressure()) {
      return {
        strategy: strategyName,
        success: false,
        errors: ['Skipped due to memory pressure'],
        duration: 0,
        itemsWarmed: 0
      };
    }

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
        // Check memory before each strategy
        if (cacheMemoryMonitor.isMemoryPressure()) {
          results.push({
            strategy: strategy.name,
            success: false,
            errors: ['Aborted due to memory pressure'],
            duration: 0,
            itemsWarmed: 0
          });
          break;
        }

        const result = await this.executeWarmupStrategy(strategy.name);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.updateWarmingResults(results);
    } finally {
      this.isWarming = false;
    }

    return results;
  }

  private updateWarmingResults(results: WarmingResult[]): void {
    this.lastWarmingResults = results;
    
    // Limit history size to prevent memory growth
    if (this.lastWarmingResults.length > this.maxWarmingResults) {
      this.lastWarmingResults = this.lastWarmingResults.slice(-this.maxWarmingResults);
    }
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

  getStrategies(): WarmingStrategy[] {
    return [...this.strategies];
  }

  getWarmingStatus(): {
    isWarming: boolean;
    lastWarmingTime: number | null;
    scheduledWarmingActive: boolean;
    totalItemsWarmed: number;
    memoryPressure: boolean;
    memoryStats: any;
  } {
    const totalItemsWarmed = this.lastWarmingResults.reduce(
      (sum, result) => sum + result.itemsWarmed, 
      0
    );

    return {
      isWarming: this.isWarming,
      lastWarmingTime: this.lastWarmingResults.length > 0 ? Date.now() : null,
      scheduledWarmingActive: !!this.warmingTimer,
      totalItemsWarmed,
      memoryPressure: cacheMemoryMonitor.isMemoryPressure(),
      memoryStats: cacheMemoryMonitor.getCurrentMemoryUsage()
    };
  }

  clearWarmingHistory(): void {
    this.lastWarmingResults = [];
  }
}

export const cacheWarmingService = CacheWarmingService.getInstance();
export type { WarmingResult, WarmingStrategy, WarmingSchedule };
