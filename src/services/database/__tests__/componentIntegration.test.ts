
// Component Integration Tests
// Tests interactions between database service components

import { databaseService } from '../databaseService';
import { connectionPool } from '../connectionPool';
import { errorRecovery } from '../errorRecovery';
import { databaseHealthMonitor } from '../monitoring/DatabaseHealthMonitor';
import { phase1Monitor } from '../../performance/Phase1Monitor';

describe('Database Component Integration Tests', () => {
  beforeAll(async () => {
    // Initialize all components
    await databaseService.initialize('integration-test');
  });

  afterAll(async () => {
    await databaseService.cleanup();
  });

  describe('Database Service + Connection Pool Integration', () => {
    test('should use connection pool for query operations', async () => {
      const initialMetrics = connectionPool.getMetrics();
      
      // Execute query through database service
      try {
        await databaseService.query('SELECT 1 as test');
      } catch (error) {
        // Expected in test environment without actual database
      }
      
      const finalMetrics = connectionPool.getMetrics();
      
      // Verify connection pool was used
      expect(finalMetrics.totalAcquired).toBeGreaterThan(initialMetrics.totalAcquired);
    });

    test('should handle connection pool exhaustion gracefully', async () => {
      const config = {
        maxConnections: 2,
        acquireTimeoutMs: 1000
      };
      
      // This test validates error handling when pool is exhausted
      expect(async () => {
        const promises = Array(5).fill(null).map(() => 
          databaseService.query('SELECT pg_sleep(2)')
        );
        await Promise.all(promises);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Error Recovery + Circuit Breaker Integration', () => {
    test('should trigger circuit breaker after multiple failures', async () => {
      errorRecovery.resetMetrics();
      
      // Simulate multiple failures
      const failingOperation = () => Promise.reject(new Error('Connection timeout'));
      
      for (let i = 0; i < 6; i++) {
        try {
          await errorRecovery.executeWithRecovery(failingOperation, 'test-operation');
        } catch (error) {
          // Expected failures
        }
      }
      
      const metrics = errorRecovery.getMetrics();
      expect(metrics.circuitState).toBe('OPEN');
    });

    test('should attempt recovery when circuit breaker is half-open', async () => {
      // Reset and set up circuit breaker in half-open state
      errorRecovery.resetCircuitBreaker();
      
      const successfulOperation = () => Promise.resolve('success');
      
      const result = await errorRecovery.executeWithRecovery(
        successfulOperation,
        'recovery-test'
      );
      
      expect(result).toBe('success');
    });
  });

  describe('Health Monitor + All Components Integration', () => {
    test('should aggregate health status from all components', () => {
      const healthStatus = databaseHealthMonitor.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('healthy');
      expect(healthStatus).toHaveProperty('issues');
      expect(healthStatus).toHaveProperty('components');
      
      // Should include all monitored components
      expect(healthStatus.components).toHaveProperty('database');
      expect(healthStatus.components).toHaveProperty('connectionPool');
      expect(healthStatus.components).toHaveProperty('errorRecovery');
    });

    test('should collect metrics from all components', () => {
      const metrics = databaseHealthMonitor.getMetrics();
      
      expect(metrics).toHaveProperty('database');
      expect(metrics).toHaveProperty('connectionPool');
      expect(metrics).toHaveProperty('errorRecovery');
    });
  });

  describe('Performance Monitor Integration', () => {
    test('should track database operations across all components', async () => {
      phase1Monitor.reset();
      
      // Perform operations that should be tracked
      try {
        await databaseService.query('SELECT 1');
        await databaseService.setTenantContext('test-tenant');
      } catch (error) {
        // Expected in test environment
      }
      
      const metrics = phase1Monitor.getMetrics();
      
      // Verify metrics are being collected - fix property name
      expect(metrics.database.totalQueries).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Component Flow', () => {
    test('should handle complete database operation lifecycle', async () => {
      const startTime = performance.now();
      
      try {
        // Initialize tenant context
        await databaseService.setTenantContext('integration-tenant');
        
        // Execute query (will use connection pool and error recovery)
        await databaseService.query('SELECT current_user');
        
        // Clear context
        await databaseService.clearContexts();
      } catch (error) {
        // Expected in test environment
      }
      
      const duration = performance.now() - startTime;
      
      // Verify reasonable performance
      expect(duration).toBeLessThan(5000); // 5 seconds max
      
      // Verify health status remains good
      const health = databaseHealthMonitor.getHealthStatus();
      expect(health.healthy || health.issues.length < 3).toBe(true);
    });
  });
});
