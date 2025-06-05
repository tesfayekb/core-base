
// Core Analytics Data Service - Focused on data operations
import { supabase } from '@/services/database';
import { AnalyticsTimeRange } from '../UserAnalyticsService';

export interface AnalyticsQueryResult<T> {
  data: T[];
  metadata: {
    totalCount: number;
    queryTime: number;
    cacheHit: boolean;
  };
}

export class AnalyticsDataService {
  private static instance: AnalyticsDataService;
  private queryCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): AnalyticsDataService {
    if (!AnalyticsDataService.instance) {
      AnalyticsDataService.instance = new AnalyticsDataService();
    }
    return AnalyticsDataService.instance;
  }

  async executeAnalyticsQuery<T>(
    query: string,
    params: any[],
    cacheKey: string
  ): Promise<AnalyticsQueryResult<T>> {
    const startTime = performance.now();
    
    // Check cache first
    const cached = this.getCachedResult<T>(cacheKey);
    if (cached) {
      return {
        data: cached,
        metadata: {
          totalCount: cached.length,
          queryTime: performance.now() - startTime,
          cacheHit: true
        }
      };
    }

    // Execute query
    const { data, error } = await supabase.rpc(query, params);
    
    if (error) {
      throw new Error(`Analytics query failed: ${error.message}`);
    }

    // Cache result
    this.setCachedResult(cacheKey, data);

    return {
      data: data || [],
      metadata: {
        totalCount: data?.length || 0,
        queryTime: performance.now() - startTime,
        cacheHit: false
      }
    };
  }

  private getCachedResult<T>(key: string): T[] | null {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(): void {
    this.queryCache.clear();
  }
}

export const analyticsDataService = AnalyticsDataService.getInstance();
