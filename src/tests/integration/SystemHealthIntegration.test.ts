
// System Health and Monitoring Integration Tests
// Tests system monitoring and health across all components

import { rbacService } from '../../services/rbac/rbacService';

describe('System Health Integration', () => {
  describe('Health Monitoring', () => {
    test('should provide comprehensive system health status', async () => {
      // Start monitoring
      rbacService.startMonitoring();

      // Perform operations to generate metrics
      await Promise.allSettled([
        rbacService.checkPermission('health-user-1', 'read', 'documents'),
        rbacService.checkPermission('health-user-2', 'write', 'documents'),
        rbacService.getUserRoles('health-user-1'),
        rbacService.getUserPermissions('health-user-2')
      ]);

      // Get system status
      const systemStatus = rbacService.getSystemStatus();

      expect(systemStatus).toHaveProperty('cacheStats');
      expect(systemStatus).toHaveProperty('performanceReport');
      expect(systemStatus).toHaveProperty('warmingStatus');
      expect(systemStatus).toHaveProperty('alerts');

      // Verify cache statistics
      expect(systemStatus.cacheStats).toHaveProperty('permissionCacheSize');
      expect(systemStatus.cacheStats).toHaveProperty('hitRate');

      rbacService.stopMonitoring();
    });

    test('should generate actionable recommendations', async () => {
      const recommendations = rbacService.generateRecommendations();

      expect(recommendations).toHaveProperty('recommendations');
      expect(recommendations).toHaveProperty('priority');
      expect(Array.isArray(recommendations.recommendations)).toBe(true);
      expect(['low', 'medium', 'high'].includes(recommendations.priority)).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics across operations', async () => {
      rbacService.startMonitoring();

      // Perform varied operations
      const operations = [
        () => rbacService.checkPermission('perf-user-1', 'read', 'documents'),
        () => rbacService.checkPermission('perf-user-2', 'write', 'documents'),
        () => rbacService.checkPermission('perf-user-3', 'delete', 'documents'),
        () => rbacService.warmUpCache('common-permissions')
      ];

      for (const operation of operations) {
        await operation();
      }

      const performanceReport = rbacService.getPerformanceReport();
      expect(typeof performanceReport).toBe('string');
      expect(performanceReport.length).toBeGreaterThan(0);

      rbacService.stopMonitoring();
    });
  });

  describe('Alert System', () => {
    test('should generate and manage alerts', async () => {
      rbacService.startMonitoring();

      // Simulate conditions that might trigger alerts
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          rbacService.checkPermission(`alert-user-${i}`, 'read', 'documents')
        )
      );

      const alerts = rbacService.getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);

      rbacService.stopMonitoring();
    });
  });

  describe('System Diagnostics', () => {
    test('should provide comprehensive system diagnostics', async () => {
      const diagnostics = rbacService.runDiagnostics();

      expect(diagnostics).toHaveProperty('status');
      expect(diagnostics).toHaveProperty('details');
      expect(['healthy', 'warning', 'critical'].includes(diagnostics.status)).toBe(true);

      expect(diagnostics.details).toHaveProperty('systemStatus');
      expect(diagnostics.details).toHaveProperty('alerts');
      expect(diagnostics.details).toHaveProperty('recommendations');
    });
  });

  describe('Cache Warming Integration', () => {
    test('should coordinate cache warming across system components', async () => {
      // Execute cache warming
      await rbacService.warmUpCache('integration-test-strategy');

      // Verify warming results
      const warmingResults = rbacService.getLastWarmingResults();
      expect(Array.isArray(warmingResults)).toBe(true);

      // Check cache stats after warming
      const cacheStats = rbacService.getCacheStats();
      expect(cacheStats).toHaveProperty('permissionCacheSize');
      expect(cacheStats).toHaveProperty('hitRate');
    });
  });
});
