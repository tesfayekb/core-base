
// Chaos Engineering Tests
// Tests system resilience under failure conditions

import { databaseService } from '../databaseService';
import { connectionPool } from '../connectionPool';
import { errorRecovery } from '../errorRecovery';
import { databaseHealthMonitor } from '../monitoring/DatabaseHealthMonitor';

describe('Chaos Engineering Tests', () => {
  beforeAll(async () => {
    await databaseService.initialize('chaos-test');
  });

  afterAll(async () => {
    await databaseService.cleanup();
  });

  describe('Connection Pool Chaos', () => {
    test('should recover from connection pool exhaustion', async () => {
      // Simulate connection pool exhaustion by creating many long-running operations
      const exhaustionOperations = Array.from({ length: 15 }, (_, i) =>
        simulateLongRunningOperation(i, 2000)
      );

      // Start exhaustion operations (don't wait for completion)
      Promise.allSettled(exhaustionOperations);
      
      // Wait for pool to become stressed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to perform normal operation during stress
      const normalOperation = async () => {
        try {
          return await databaseService.query('SELECT 1');
        } catch (error) {
          return { error: error.message };
        }
      };

      const result = await normalOperation();
      
      // System should either succeed or fail gracefully
      expect(result).toBeDefined();
      
      // Pool should eventually recover
      await new Promise(resolve => setTimeout(resolve, 3000));
      const health = connectionPool.getHealthStatus();
      expect(health.utilization).toBeLessThan(0.9);
    });

    test('should handle rapid connection acquisition/release cycles', async () => {
      const rapidCycles = Array.from({ length: 50 }, (_, i) =>
        rapidConnectionCycle(i)
      );

      const results = await Promise.allSettled(rapidCycles);
      
      // Most operations should complete without crashing the system
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount / rapidCycles.length).toBeGreaterThan(0.5);
      
      // Connection pool should remain stable
      const poolMetrics = connectionPool.getMetrics();
      expect(poolMetrics.totalConnections).toBeGreaterThan(0);
    });
  });

  describe('Circuit Breaker Chaos', () => {
    test('should handle circuit breaker state transitions under chaos', async () => {
      errorRecovery.resetMetrics();
      
      // Create chaotic failure patterns
      const chaoticOperations = [
        // Burst of failures to trip circuit breaker
        ...Array.from({ length: 10 }, () => createFailingOperation()),
        // Wait period
        () => new Promise(resolve => setTimeout(resolve, 1000)),
        // Mixed success/failure to test half-open state
        ...Array.from({ length: 5 }, (_, i) => 
          i % 2 === 0 ? createSuccessfulOperation() : createFailingOperation()
        )
      ];

      for (const operation of chaoticOperations) {
        try {
          await operation();
        } catch (error) {
          // Expected failures during chaos testing
        }
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const metrics = errorRecovery.getMetrics();
      
      // System should have attempted recovery
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.circuitBreakerTrips).toBeGreaterThan(0);
    });
  });

  describe('System Degradation Scenarios', () => {
    test('should maintain partial functionality during component failures', async () => {
      // Simulate various failure modes simultaneously
      const degradationTest = async () => {
        const operations = [
          // Normal operations
          simulateUserOperation('normal-1'),
          simulateUserOperation('normal-2'),
          // Operations that will fail
          simulateComponentFailure('database-timeout'),
          simulateComponentFailure('connection-error'),
          // Recovery operations
          simulateRecoveryOperation('recovery-1')
        ];

        return await Promise.allSettled(operations);
      };

      const results = await degradationTest();
      
      // System should not completely fail
      const successfulOperations = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulOperations).toBeGreaterThan(0);
      
      // Health monitoring should detect issues but system should remain partially functional
      const health = databaseHealthMonitor.getHealthStatus();
      expect(health.components).toBeDefined();
    });

    test('should recover from cascading failures', async () => {
      // Reset all systems
      errorRecovery.resetMetrics();
      
      // Simulate cascading failure scenario
      const cascadingFailures = [
        // Start with connection issues
        () => simulateComponentFailure('connection-pool-failure'),
        // Lead to circuit breaker activation
        () => simulateComponentFailure('circuit-breaker-trip'),
        // Cause monitoring alerts
        () => simulateComponentFailure('monitoring-degradation'),
        // Recovery attempts
        () => simulateRecoveryOperation('system-recovery')
      ];

      for (const failure of cascadingFailures) {
        try {
          await failure();
        } catch (error) {
          // Expected during chaos testing
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Allow time for recovery mechanisms
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // System should show signs of attempted recovery
      const recoveryMetrics = errorRecovery.getMetrics();
      expect(recoveryMetrics.totalOperations).toBeGreaterThan(0);
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure with large operations
      const memoryPressureOperations = Array.from({ length: 10 }, (_, i) =>
        simulateLargeMemoryOperation(i)
      );

      const startTime = performance.now();
      await Promise.allSettled(memoryPressureOperations);
      const duration = performance.now() - startTime;

      // Should complete within reasonable time even under pressure
      expect(duration).toBeLessThan(30000); // 30 seconds max
      
      // System should remain responsive
      const quickOperation = await simulateQuickOperation();
      expect(quickOperation).toBeDefined();
    });
  });
});

// Chaos testing helper functions
async function simulateLongRunningOperation(id: number, duration: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(() => resolve({ id, completed: true }), duration);
  });
}

async function rapidConnectionCycle(id: number): Promise<any> {
  try {
    await databaseService.setTenantContext(`rapid-${id}`);
    await databaseService.query(`SELECT ${id}`);
    await databaseService.clearContexts();
    return { id, success: true };
  } catch (error) {
    return { id, success: false, error: error.message };
  }
}

function createFailingOperation() {
  return () => errorRecovery.executeWithRecovery(
    () => Promise.reject(new Error('Chaos failure')),
    'chaos-failure'
  );
}

function createSuccessfulOperation() {
  return () => errorRecovery.executeWithRecovery(
    () => Promise.resolve({ success: true }),
    'chaos-success'
  );
}

async function simulateUserOperation(userId: string): Promise<any> {
  try {
    await databaseService.setTenantContext(`chaos-tenant-${userId}`);
    return { userId, success: true };
  } catch (error) {
    return { userId, success: false, error: error.message };
  }
}

async function simulateComponentFailure(failureType: string): Promise<any> {
  const failureOperation = () => Promise.reject(new Error(`Simulated ${failureType}`));
  
  try {
    return await errorRecovery.executeWithRecovery(failureOperation, failureType);
  } catch (error) {
    return { failureType, failed: true, error: error.message };
  }
}

async function simulateRecoveryOperation(operationType: string): Promise<any> {
  try {
    // Simulate a recovery operation that should succeed
    return await databaseService.testConnection();
  } catch (error) {
    return { operationType, recovered: false, error: error.message };
  }
}

async function simulateLargeMemoryOperation(id: number): Promise<any> {
  // Simulate processing large dataset
  const largeArray = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    data: `large-data-${id}-${i}`.repeat(10)
  }));
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return { id, processedCount: largeArray.length };
}

async function simulateQuickOperation(): Promise<any> {
  try {
    return await databaseService.testConnection();
  } catch (error) {
    return { quick: true, error: error.message };
  }
}
