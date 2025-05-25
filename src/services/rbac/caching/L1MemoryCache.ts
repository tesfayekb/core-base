
// L1 Memory Cache Implementation with size limits and memory monitoring
import { CacheLevel } from './CacheLevel';
import { cacheMemoryMonitor } from './CacheMemoryMonitor';

export interface L1CacheConfig {
  maxSize: number;
  maxMemoryBytes: number;
  defaultTtl: number;
  cleanupInterval: number;
}

export class L1MemoryCache implements CacheLevel {
  private cache = new Map<string, { value: any; expiry: number; size: number }>();
  private stats = { hits: 0, misses: 0, evictions: 0 };
  private config: L1CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<L1CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      maxMemoryBytes: config.maxMemoryBytes || 50 * 1024 * 1024, // 50MB
      defaultTtl: config.defaultTtl || 300000, // 5 minutes
      cleanupInterval: config.cleanupInterval || 60000 // 1 minute
    };
    
    this.startCleanupTimer();
  }

  get(key: string): any {
    const entry = this.cache.get(key);
    if (!entry || entry.expiry < Date.now()) {
      this.stats.misses++;
      if (entry) {
        this.cache.delete(key);
      }
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  set(key: string, value: any, ttl: number = this.config.defaultTtl): void {
    const size = this.estimateSize(value);
    
    // Check if we need to evict before adding
    this.enforceMemoryLimits(size);
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
      size
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getStats(): { 
    size: number; 
    hits: number; 
    misses: number; 
    evictions: number;
    memoryUsage: number;
    hitRate: number;
  } {
    const memoryUsage = this.getTotalMemoryUsage();
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      memoryUsage,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    };
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Rough UTF-16 estimation
    } catch {
      return 1024; // Default 1KB for non-serializable values
    }
  }

  private getTotalMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  private enforceMemoryLimits(newItemSize: number): void {
    // Check size limit
    while (this.cache.size >= this.config.maxSize) {
      this.evictOldestEntry();
    }
    
    // Check memory limit
    const currentMemory = this.getTotalMemoryUsage();
    if (currentMemory + newItemSize > this.config.maxMemoryBytes) {
      this.evictByMemoryPressure(newItemSize);
    }
  }

  private evictOldestEntry(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private evictByMemoryPressure(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.expiry - b.expiry); // Sort by expiry time
    
    let freedSpace = 0;
    let evicted = 0;
    
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      freedSpace += entry.size;
      evicted++;
      
      if (freedSpace >= requiredSpace || evicted >= this.cache.size * 0.1) {
        break; // Don't evict more than 10% at once
      }
    }
    
    this.stats.evictions += evicted;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
      cacheMemoryMonitor.recordMemoryUsage();
    }, this.config.cleanupInterval);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}
