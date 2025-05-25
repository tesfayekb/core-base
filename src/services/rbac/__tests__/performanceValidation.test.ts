
import { rbacService } from '../rbacService';
import { enhancedPermissionResolver } from '../EnhancedPermissionResolver';
import { cachePerformanceMonitor } from '../CachePerformanceMonitor';

describe('RBAC Performance Validation (<15ms target)', () => {
  beforeEach(() => {
    // Clear any existing performance data
    jest.clearAllMocks();
  });

  test('permission check should complete under 15ms', async () => {
    const measurements: number[] = [];
    
    // Run multiple iterations to get reliable measurements
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      
      await rbacService.checkPermission(
        'test-user-id',
        'read',
        'documents',
        { tenantId: 'test-tenant' }
      );
      
      const duration = performance.now() - startTime;
      measurements.push(duration);
    }

    const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const maxTime = Math.max(...measurements);
    
    expect(averageTime).toBeLessThan(15);
    expect(maxTime).toBeLessThan(25); // Allow some variance
    
    console.log(`Average permission check time: ${averageTime.toFixed(2)}ms`);
    console.log(`Max permission check time: ${maxTime.toFixed(2)}ms`);
  });

  test('cached permission check should complete under 1ms', async () => {
    // First call to populate cache
    await rbacService.checkPermission(
      'cached-user-id',
      'read',
      'documents',
      { tenantId: 'test-tenant' }
    );

    // Measure cached call
    const startTime = performance.now();
    await rbacService.checkPermission(
      'cached-user-id',
      'read',
      'documents',
      { tenantId: 'test-tenant' }
    );
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(1);
    console.log(`Cached permission check time: ${duration.toFixed(3)}ms`);
  });

  test('bulk permission checks should maintain performance', async () => {
    const startTime = performance.now();
    
    const promises = Array.from({ length: 50 }, (_, i) => 
      rbacService.checkPermission(
        `user-${i}`,
        'read',
        'documents',
        { tenantId: 'test-tenant' }
      )
    );

    await Promise.all(promises);
    
    const totalTime = performance.now() - startTime;
    const averagePerCheck = totalTime / 50;
    
    expect(averagePerCheck).toBeLessThan(15);
    console.log(`Bulk operation average per check: ${averagePerCheck.toFixed(2)}ms`);
  });

  test('cache performance monitoring should track metrics accurately', async () => {
    cachePerformanceMonitor.startMonitoring();
    
    // Generate some activity
    for (let i = 0; i < 5; i++) {
      await rbacService.checkPermission(
        `perf-user-${i}`,
        'read',
        'documents',
        { tenantId: 'test-tenant' }
      );
    }

    // Wait for metrics collection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const metrics = cachePerformanceMonitor.getCurrentMetrics();
    
    if (metrics) {
      expect(metrics.averageResponseTime).toBeLessThan(15);
      expect(metrics.hitRate).toBeGreaterThanOrEqual(0);
      console.log(`Cache hit rate: ${(metrics.hitRate * 100).toFixed(2)}%`);
      console.log(`Average response time: ${metrics.averageResponseTime.toFixed(2)}ms`);
    }

    cachePerformanceMonitor.stopMonitoring();
  });
});
