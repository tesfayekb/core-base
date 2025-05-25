
import { L1MemoryCache } from '../caching/L1MemoryCache';
import { cacheMemoryMonitor } from '../caching/CacheMemoryMonitor';
import { advancedCacheManager } from '../AdvancedCacheManager';

describe('Cache Memory Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('L1MemoryCache Size Limits', () => {
    test('should enforce maximum cache size', () => {
      const cache = new L1MemoryCache({ maxSize: 3 });
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1
      
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(3);
      expect(stats.evictions).toBeGreaterThan(0);
      expect(cache.get('key1')).toBeNull(); // Should be evicted
    });

    test('should enforce memory limits', () => {
      const cache = new L1MemoryCache({ 
        maxMemoryBytes: 1024, // 1KB limit
        maxSize: 1000 
      });
      
      // Add large values that exceed memory limit
      const largeValue = 'x'.repeat(500); // 500 bytes
      cache.set('key1', largeValue);
      cache.set('key2', largeValue);
      cache.set('key3', largeValue); // Should trigger eviction
      
      const stats = cache.getStats();
      expect(stats.memoryUsage).toBeLessThanOrEqual(1024);
      expect(stats.evictions).toBeGreaterThan(0);
    });

    test('should cleanup expired entries automatically', async () => {
      const cache = new L1MemoryCache({ 
        cleanupInterval: 50, // 50ms cleanup interval
        defaultTtl: 100 // 100ms TTL
      });
      
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cache.get('key1')).toBeNull();
      
      cache.destroy(); // Cleanup
    });
  });

  describe('Memory Monitoring', () => {
    test('should track memory usage over time', () => {
      cacheMemoryMonitor.recordMemoryUsage();
      cacheMemoryMonitor.recordMemoryUsage();
      
      const stats = cacheMemoryMonitor.getCacheMemoryStats(100);
      expect(stats.totalCacheSize).toBe(100);
      expect(stats.memoryUsagePercentage).toBeGreaterThanOrEqual(0);
    });

    test('should detect memory pressure', () => {
      const isPressure = cacheMemoryMonitor.isMemoryPressure();
      expect(typeof isPressure).toBe('boolean');
    });

    test('should provide memory recommendations', () => {
      const recommendations = cacheMemoryMonitor.getMemoryRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Advanced Cache Manager Memory Limits', () => {
    test('should enforce dependency tracking limits', async () => {
      const manager = advancedCacheManager;
      
      // Add many dependencies to trigger limit enforcement
      for (let i = 0; i < 10; i++) {
        await manager.set(`key${i}`, `value${i}`, 300000, [`dep${i}`]);
      }
      
      const stats = manager.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    test('should skip cache warming under memory pressure', async () => {
      const manager = advancedCacheManager;
      
      // Mock memory pressure
      jest.spyOn(cacheMemoryMonitor, 'isMemoryPressure').mockReturnValue(true);
      
      const items = [
        { userId: 'user1', action: 'read', resource: 'documents' }
      ];
      
      const loadFunction = jest.fn().mockResolvedValue(true);
      
      await manager.warmCache(items, loadFunction);
      
      // Should not call load function due to memory pressure
      expect(loadFunction).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    test('should handle memory cleanup across all cache layers', () => {
      const manager = advancedCacheManager;
      
      // Add some data
      manager.set('test1', 'value1');
      manager.set('test2', 'value2');
      
      // Perform cleanup
      manager.performMemoryCleanup();
      
      // Verify cleanup
      const stats = manager.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    test('should provide comprehensive memory statistics', () => {
      const manager = advancedCacheManager;
      const memoryStats = manager.getMemoryStats();
      
      expect(memoryStats).toHaveProperty('totalCacheSize');
      expect(memoryStats).toHaveProperty('memoryUsageBytes');
      expect(memoryStats).toHaveProperty('memoryUsagePercentage');
      expect(memoryStats).toHaveProperty('cacheEfficiency');
    });
  });
});
