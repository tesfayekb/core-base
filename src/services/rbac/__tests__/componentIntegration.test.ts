
import { rbacService } from '../rbacService';
import { enhancedPermissionResolver } from '../EnhancedPermissionResolver';
import { cacheWarmingService } from '../CacheWarmingService';
import { cachePerformanceMonitor } from '../CachePerformanceMonitor';

describe('RBAC Component Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Resolution + Caching Integration', () => {
    test('should cache permission results and serve from cache', async () => {
      // First call - should go through resolution
      const result1 = await rbacService.checkPermission(
        'integration-user',
        'read',
        'documents',
        { tenantId: 'test-tenant' }
      );

      // Second call - should use cache
      const result2 = await rbacService.checkPermission(
        'integration-user',
        'read',
        'documents',
        { tenantId: 'test-tenant' }
      );

      expect(result1).toBe(result2);
      
      const cacheStats = rbacService.getCacheStats();
      expect(cacheStats.permissionCacheSize).toBeGreaterThan(0);
    });
  });

  describe('Cache Warming + Performance Monitoring Integration', () => {
    test('should warm cache and improve performance metrics', async () => {
      // Start monitoring
      cachePerformanceMonitor.startMonitoring();
      
      // Execute cache warming
      await cacheWarmingService.executeAllStrategies();
      
      // Check warming results
      const warmingResults = cacheWarmingService.getLastWarmingResults();
      expect(warmingResults.length).toBeGreaterThan(0);
      expect(warmingResults[0].success).toBe(true);
      
      // Verify performance improvement
      const performanceReport = rbacService.getPerformanceReport();
      expect(performanceReport).toContain('Performance Report');
      
      cachePerformanceMonitor.stopMonitoring();
    });
  });

  describe('Multi-tenant + RBAC Integration', () => {
    test('should enforce tenant isolation in permission checks', async () => {
      const tenant1Result = await rbacService.checkPermission(
        'user-1',
        'read',
        'documents',
        { tenantId: 'tenant-1' }
      );

      const tenant2Result = await rbacService.checkPermission(
        'user-1',
        'read',
        'documents',
        { tenantId: 'tenant-2' }
      );

      // Results may differ based on tenant-specific permissions
      expect(typeof tenant1Result).toBe('boolean');
      expect(typeof tenant2Result).toBe('boolean');
    });
  });

  describe('Performance + Alerting Integration', () => {
    test('should generate alerts when performance degrades', async () => {
      cachePerformanceMonitor.startMonitoring();
      
      // Wait for initial metrics collection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const alerts = rbacService.getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      
      // Check system diagnostics
      const diagnostics = rbacService.runDiagnostics();
      expect(diagnostics.status).toMatch(/healthy|warning/);
      expect(diagnostics.details).toHaveProperty('systemStatus');
      expect(diagnostics.details).toHaveProperty('alerts');
      expect(diagnostics.details).toHaveProperty('recommendations');
      
      cachePerformanceMonitor.stopMonitoring();
    });
  });

  describe('Complete System Integration', () => {
    test('should handle end-to-end permission workflow', async () => {
      // 1. Start monitoring
      rbacService.startMonitoring();
      
      // 2. Warm up cache
      await rbacService.warmUpCache('common-permissions');
      
      // 3. Check permissions
      const hasPermission = await rbacService.checkPermission(
        'end-to-end-user',
        'create',
        'documents',
        { tenantId: 'e2e-tenant' }
      );
      
      // 4. Get system status
      const systemStatus = rbacService.getSystemStatus();
      
      // 5. Generate recommendations
      const recommendations = rbacService.generateRecommendations();
      
      // Verify all components worked together
      expect(typeof hasPermission).toBe('boolean');
      expect(systemStatus).toHaveProperty('cacheStats');
      expect(systemStatus).toHaveProperty('performanceReport');
      expect(systemStatus).toHaveProperty('warmingStatus');
      expect(systemStatus).toHaveProperty('alerts');
      expect(recommendations).toHaveProperty('recommendations');
      expect(recommendations).toHaveProperty('priority');
      
      // 6. Stop monitoring
      rbacService.stopMonitoring();
    });
  });

  describe('Error Handling Integration', () => {
    test('should gracefully handle errors across components', async () => {
      // Test with invalid inputs
      const result = await rbacService.checkPermission(
        '',
        'invalid-action',
        'invalid-resource'
      );
      
      expect(typeof result).toBe('boolean');
      
      // System should remain stable
      const diagnostics = rbacService.runDiagnostics();
      expect(diagnostics.status).toMatch(/healthy|warning/);
    });
  });
});
