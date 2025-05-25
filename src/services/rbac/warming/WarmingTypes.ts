
// Cache Warming Types
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
