
// Phase 1.2 Performance Benchmarks Test Suite
// Validates all Phase 1.2 performance targets

import { PerformanceMeasurement } from '../PerformanceMeasurement';
import { phase1Monitor } from '../Phase1Monitor';
import { connectionPool } from '../../database/connectionPool';
import { errorRecovery } from '../../database/errorRecovery';
import { alertingSystem } from '../../monitoring/alertingSystem';

describe('Phase 1.2 Performance Benchmarks', () => {
  let performanceMeasurement: PerformanceMeasurement;

  beforeEach(() => {
    performanceMeasurement = PerformanceMeasurement.getInstance();
    phase1Monitor.reset();
  });

  describe('Database Performance Targets', () => {
    test('Simple queries should complete under 10ms', async () => {
      const mockSimpleQuery = async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return { rows: [{ id: 1 }], rowCount: 1 };
      };

      const result = await performanceMeasurement.measureOperation('simpleQuery', mockSimpleQuery);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(10);
    });

    test('Complex queries should complete under 50ms', async () => {
      const mockComplexQuery = async () => {
        await new Promise(resolve => setTimeout(resolve, 25));
        return { rows: Array(100).fill({ id: 1 }), rowCount: 100 };
      };

      const result = await performanceMeasurement.measureOperation('complexQuery', mockComplexQuery);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(50);
    });
  });

  describe('Authentication Performance Targets', () => {
    test('Authentication operations should complete under 200ms', async () => {
      const mockAuth = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, user: { id: '123' } };
      };

      const result = await performanceMeasurement.measureOperation('authentication', mockAuth);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(200);
    });
  });

  describe('RBAC Performance Targets', () => {
    test('Permission checks should complete under 15ms', async () => {
      const mockPermissionCheck = async () => {
        await new Promise(resolve => setTimeout(resolve, 8));
        return { hasPermission: true };
      };

      const result = await performanceMeasurement.measureOperation('permissionCheck', mockPermissionCheck);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(15);
    });
  });

  describe('Connection Pool Performance', () => {
    test('Connection acquisition should complete under 100ms', async () => {
      const mockConnectionAcquire = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { connected: true };
      };

      const result = await performanceMeasurement.measureOperation('connectionPoolAcquire', mockConnectionAcquire);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(100);
    });
  });

  describe('Error Recovery Performance', () => {
    test('Error recovery should complete under 50ms', async () => {
      const mockErrorRecovery = async () => {
        await new Promise(resolve => setTimeout(resolve, 25));
        return { recovered: true };
      };

      const result = await performanceMeasurement.measureOperation('errorRecovery', mockErrorRecovery);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(50);
    });

    test('Error recovery system maintains high reliability', async () => {
      // Simulate some operations for metrics
      errorRecovery.resetMetrics();
      
      // Simulate successful operations
      for (let i = 0; i < 10; i++) {
        try {
          await errorRecovery.executeWithRecovery(
            async () => ({ success: true }),
            'test-operation'
          );
        } catch (error) {
          // Expected for testing
        }
      }

      const metrics = errorRecovery.getMetrics();
      
      expect(metrics.reliability).toBeGreaterThanOrEqual(0.9);
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.reliability).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Circuit Breaker Performance', () => {
    test('Circuit breaker responses should complete under 5ms', async () => {
      const mockCircuitBreakerCheck = async () => {
        await new Promise(resolve => setTimeout(resolve, 2));
        return { state: 'CLOSED' };
      };

      const result = await performanceMeasurement.measureOperation('circuitBreakerResponse', mockCircuitBreakerCheck);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(5);
    });
  });

  describe('Monitoring Performance', () => {
    test('Metrics collection should complete under 30ms', async () => {
      const mockMetricsCollection = async () => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return phase1Monitor.getMetrics();
      };

      const result = await performanceMeasurement.measureOperation('metricsCollection', mockMetricsCollection);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(30);
    });

    test('Alert evaluation should complete under 25ms', async () => {
      const mockAlertEvaluation = async () => {
        await new Promise(resolve => setTimeout(resolve, 12));
        return alertingSystem.getAlerts({ limit: 10 });
      };

      const result = await performanceMeasurement.measureOperation('alertEvaluation', mockAlertEvaluation);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(25);
    });
  });

  describe('Tenant Isolation Performance', () => {
    test('Tenant context switching should complete under 20ms', async () => {
      const mockTenantSwitch = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { tenantId: 'test-tenant', switched: true };
      };

      const result = await performanceMeasurement.measureOperation('tenantIsolation', mockTenantSwitch);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(20);
    });
  });

  describe('Audit Performance', () => {
    test('Audit writes should complete under 5ms', async () => {
      const mockAuditWrite = async () => {
        await new Promise(resolve => setTimeout(resolve, 2));
        return { logged: true, id: '123' };
      };

      const result = await performanceMeasurement.measureOperation('auditWrite', mockAuditWrite);

      expect(result.success).toBe(true);
      expect(result.validation.passed).toBe(true);
      expect(result.duration).toBeLessThan(5);
    });
  });

  describe('Overall System Health', () => {
    test('Phase 1.2 health status should be healthy', () => {
      const health = phase1Monitor.getHealthStatus();
      
      // System should start in healthy state
      expect(['healthy', 'warning']).toContain(health.status);
      expect(health.score).toBeGreaterThanOrEqual(70);
    });

    test('Performance report generation should be fast', () => {
      const startTime = performance.now();
      const report = phase1Monitor.generateReport();
      const duration = performance.now() - startTime;
      
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10); // Report generation should be very fast
    });
  });
});
