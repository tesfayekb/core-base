
// L1 Memory Cache Implementation
import { CacheLevel } from './CacheLevel';

export class L1MemoryCache implements CacheLevel {
  private cache = new Map<string, { value: any; expiry: number }>();
  private stats = { hits: 0, misses: 0 };

  get(key: string): any {
    const entry = this.cache.get(key);
    if (!entry || entry.expiry < Date.now()) {
      this.stats.misses++;
      this.cache.delete(key);
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  set(key: string, value: any, ttl: number = 300000): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses
    };
  }
}
