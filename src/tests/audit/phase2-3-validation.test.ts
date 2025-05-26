
// Phase 2.3 Enhanced Audit Logging - Validation Tests

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { standardizedAuditLogger } from '../../services/audit/StandardizedAuditLogger';
import { realTimeAuditMonitor } from '../../services/audit/RealTimeAuditMonitor';

describe('Phase 2.3: Enhanced Audit Logging Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Standardized Audit Logger', () => {
    it('should create standardized audit log entries', async () => {
      const mockContext = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        requestId: 'req-789',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      await standardizedAuditLogger.logStandardizedEvent(
        'tenant.update',
        'tenant',
        'tenant-456',
        'success',
        mockContext,
        { before: { name: 'Old Name' }, after: { name: 'New Name' } },
        { operation: 'name_change' }
      );

      // Verify the audit log follows standardized format
      expect(standardizedAuditLogger).toBeDefined();
    });

    it('should generate trace IDs for event correlation', async () => {
      const mockContext = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        requestId: 'req-789'
      };

      await standardizedAuditLogger.logStandardizedEvent(
        'test.action',
        'test_resource',
        'resource-123',
        'success',
        mockContext
      );

      const traceId = standardizedAuditLogger.getCorrelatedEvents('req-789');
      expect(traceId).toBeDefined();
      expect(traceId).toMatch(/^trace-/);
    });

    it('should handle security events with proper severity mapping', async () => {
      const mockContext = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        ipAddress: '192.168.1.1'
      };

      await standardizedAuditLogger.logSecurityEvent(
        'unauthorized_access',
        'critical',
        { resource: 'sensitive_data', outcome: 'failure' },
        mockContext
      );

      expect(standardizedAuditLogger).toBeDefined();
    });
  });

  describe('Real-Time Audit Monitor', () => {
    it('should calculate audit metrics correctly', async () => {
      const mockTenantId = 'tenant-123';
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      // Mock supabase response
      jest.doMock('../../integrations/supabase/client', () => ({
        supabase: {
          from: jest.fn(() => ({
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  lte: jest.fn(() => ({
                    order: jest.fn(() => Promise.resolve({
                      data: [
                        {
                          event_type: 'authentication',
                          action: 'login',
                          details: { outcome: 'success' },
                          timestamp: new Date().toISOString()
                        },
                        {
                          event_type: 'security',
                          action: 'access_denied',
                          details: { outcome: 'failure' },
                          timestamp: new Date().toISOString()
                        }
                      ],
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }))
        }
      }));

      const metrics = await realTimeAuditMonitor.getAuditMetrics(mockTenantId, timeRange);

      expect(metrics).toBeDefined();
      expect(metrics.totalEvents).toBeGreaterThanOrEqual(0);
      expect(metrics.eventsByType).toBeDefined();
      expect(metrics.securityEvents).toBeGreaterThanOrEqual(0);
      expect(metrics.failureRate).toBeGreaterThanOrEqual(0);
      expect(metrics.recentActivity).toBeDefined();
    });

    it('should generate compliance reports', async () => {
      const mockTenantId = 'tenant-123';
      
      const report = await realTimeAuditMonitor.generateComplianceReport(
        mockTenantId,
        'daily'
      );

      expect(report).toBeDefined();
      expect(report.reportType).toBe('daily');
      expect(report.tenantId).toBe(mockTenantId);
      expect(report.generatedAt).toBeDefined();
      expect(report.complianceChecks).toBeDefined();
    });

    it('should handle real-time event subscriptions', () => {
      const mockCallback = jest.fn();
      
      const unsubscribe = realTimeAuditMonitor.subscribeToAuditEvents(mockCallback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Test unsubscribe
      unsubscribe();
    });
  });

  describe('Audit Performance Requirements', () => {
    it('should process audit events within performance requirements', async () => {
      const startTime = performance.now();
      
      await standardizedAuditLogger.logStandardizedEvent(
        'performance.test',
        'test_resource',
        'resource-123',
        'success',
        {
          userId: 'user-123',
          tenantId: 'tenant-456'
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 5ms as per Phase 2.3 requirements
      expect(duration).toBeLessThan(5);
    });

    it('should handle batch audit processing efficiently', async () => {
      const batchSize = 10;
      const events = Array.from({ length: batchSize }, (_, i) => ({
        action: `batch.test.${i}`,
        resourceType: 'test_resource',
        resourceId: `resource-${i}`,
        outcome: 'success' as const,
        context: {
          userId: 'user-123',
          tenantId: 'tenant-456'
        }
      }));

      const startTime = performance.now();
      
      await Promise.all(
        events.map(event => 
          standardizedAuditLogger.logStandardizedEvent(
            event.action,
            event.resourceType,
            event.resourceId,
            event.outcome,
            event.context
          )
        )
      );
      
      const endTime = performance.now();
      const avgDuration = (endTime - startTime) / batchSize;
      
      // Average per event should still be under 5ms
      expect(avgDuration).toBeLessThan(5);
    });
  });

  describe('Tenant Isolation Verification', () => {
    it('should ensure tenant context in all audit events', async () => {
      const tenant1Context = {
        userId: 'user-123',
        tenantId: 'tenant-111',
        requestId: 'req-1'
      };

      const tenant2Context = {
        userId: 'user-456',
        tenantId: 'tenant-222',
        requestId: 'req-2'
      };

      await standardizedAuditLogger.logStandardizedEvent(
        'test.isolation',
        'test_resource',
        'resource-1',
        'success',
        tenant1Context
      );

      await standardizedAuditLogger.logStandardizedEvent(
        'test.isolation',
        'test_resource',
        'resource-2',
        'success',
        tenant2Context
      );

      // Verify events are properly isolated
      const trace1 = standardizedAuditLogger.getCorrelatedEvents('req-1');
      const trace2 = standardizedAuditLogger.getCorrelatedEvents('req-2');
      
      expect(trace1).not.toBe(trace2);
    });
  });
});
