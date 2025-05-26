
// Audit System Performance Validation Tests - Phase 2.3
// Validates performance under high volume audit logging

import { enhancedAuditService } from '../../services/audit/enhancedAuditService';
import { standardizedAuditLogger } from '../../services/audit/StandardizedAuditLogger';
import { threatDetectionService } from '../../services/security/ThreatDetectionService';

describe('Audit System Performance Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('High Volume Logging Performance', () => {
    test('should handle 1000 concurrent audit events under 5ms average', async () => {
      const eventCount = 1000;
      const events = Array.from({ length: eventCount }, (_, i) => ({
        action: `test.performance.${i}`,
        resourceType: 'test_resource',
        resourceId: `resource-${i}`,
        outcome: 'success' as const,
        context: {
          userId: `user-${i % 10}`,
          tenantId: `tenant-${i % 5}`,
          requestId: `req-${i}`
        }
      }));

      const startTime = performance.now();
      
      // Execute all events concurrently
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
      const totalDuration = endTime - startTime;
      const averageDuration = totalDuration / eventCount;
      
      console.log(`🚀 Performance Test Results:`);
      console.log(`📊 Total Events: ${eventCount}`);
      console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}ms`);
      console.log(`📈 Average per Event: ${averageDuration.toFixed(2)}ms`);
      
      // Performance requirement: <5ms average per event
      expect(averageDuration).toBeLessThan(5);
      
      // Total should be reasonable for bulk processing
      expect(totalDuration).toBeLessThan(1000); // 1 second for 1000 events
    }, 10000);

    test('should maintain performance with mixed event types', async () => {
      const eventTypes = [
        { action: 'auth.login', type: 'authentication' },
        { action: 'rbac.permission.check', type: 'authorization' },
        { action: 'data.create', type: 'data_access' },
        { action: 'security.threat.detected', type: 'security' }
      ];

      const events = Array.from({ length: 500 }, (_, i) => {
        const eventType = eventTypes[i % eventTypes.length];
        return {
          ...eventType,
          resourceType: 'mixed_test',
          resourceId: `resource-${i}`,
          outcome: 'success' as const,
          context: {
            userId: `user-${i}`,
            tenantId: `tenant-${i % 3}`
          }
        };
      });

      const startTime = performance.now();
      
      for (const event of events) {
        await standardizedAuditLogger.logStandardizedEvent(
          event.action,
          event.resourceType,
          event.resourceId,
          event.outcome,
          event.context
        );
      }
      
      const endTime = performance.now();
      const averageDuration = (endTime - startTime) / events.length;
      
      // Should maintain performance with mixed types
      expect(averageDuration).toBeLessThan(10);
    }, 15000);
  });

  describe('Threat Detection Performance', () => {
    test('should analyze security events under 2ms per event', async () => {
      const securityEvents = Array.from({ length: 100 }, (_, i) => ({
        action: 'auth.login',
        outcome: i % 5 === 0 ? 'failure' : 'success', // 20% failure rate
        userId: `user-${i % 10}`,
        tenantId: `tenant-${i % 3}`,
        timestamp: new Date().toISOString()
      }));

      const analysisResults = [];
      const startTime = performance.now();

      for (const event of securityEvents) {
        const threat = await threatDetectionService.analyzeSecurityEvent(event);
        analysisResults.push(threat);
      }

      const endTime = performance.now();
      const averageDuration = (endTime - startTime) / securityEvents.length;

      console.log(`🔍 Threat Analysis Performance:`);
      console.log(`📊 Events Analyzed: ${securityEvents.length}`);
      console.log(`⏱️  Average Analysis Time: ${averageDuration.toFixed(2)}ms`);
      console.log(`🚨 Threats Detected: ${analysisResults.filter(r => r !== null).length}`);

      // Performance requirement: <2ms per event analysis
      expect(averageDuration).toBeLessThan(2);
    }, 5000);

    test('should handle threat pattern detection efficiently', async () => {
      // Simulate a brute force attack pattern
      const bruteForceEvents = Array.from({ length: 10 }, (_, i) => ({
        action: 'auth.login',
        outcome: 'failure' as const,
        userId: 'attacker-user',
        tenantId: 'target-tenant',
        timestamp: new Date().toISOString()
      }));

      const startTime = performance.now();
      const threats = [];

      for (const event of bruteForceEvents) {
        const threat = await threatDetectionService.analyzeSecurityEvent(event);
        if (threat) threats.push(threat);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Should detect the brute force pattern
      expect(threats.length).toBeGreaterThan(0);
      
      // Should complete pattern detection quickly
      expect(totalDuration).toBeLessThan(100); // 100ms for pattern detection
    }, 3000);
  });

  describe('Memory Usage Validation', () => {
    test('should not leak memory during extended logging', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate sustained audit activity
      for (let batch = 0; batch < 10; batch++) {
        const batchEvents = Array.from({ length: 100 }, (_, i) => 
          standardizedAuditLogger.logStandardizedEvent(
            `batch.${batch}.event.${i}`,
            'memory_test',
            `resource-${batch}-${i}`,
            'success',
            { userId: `user-${i}`, tenantId: `tenant-${batch}` }
          )
        );
        
        await Promise.all(batchEvents);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseKB = memoryIncrease / 1024;

      console.log(`💾 Memory Usage Test:`);
      console.log(`📊 Initial Memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📊 Final Memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📈 Memory Increase: ${memoryIncreaseKB.toFixed(2)} KB`);

      // Memory increase should be reasonable (<10MB for 1000 events)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }, 20000);
  });

  describe('Concurrent Access Performance', () => {
    test('should handle concurrent tenant operations efficiently', async () => {
      const tenantCount = 5;
      const eventsPerTenant = 50;

      const tenantOperations = Array.from({ length: tenantCount }, (_, tenantIndex) =>
        Array.from({ length: eventsPerTenant }, (_, eventIndex) =>
          standardizedAuditLogger.logStandardizedEvent(
            `tenant.operation.${eventIndex}`,
            'tenant_resource',
            `resource-${tenantIndex}-${eventIndex}`,
            'success',
            {
              userId: `user-${tenantIndex}-${eventIndex}`,
              tenantId: `tenant-${tenantIndex}`
            }
          )
        )
      );

      const startTime = performance.now();
      
      // Execute all tenant operations concurrently
      await Promise.all(tenantOperations.flat());
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const totalEvents = tenantCount * eventsPerTenant;
      const averageDuration = totalDuration / totalEvents;

      console.log(`🏢 Concurrent Tenant Test:`);
      console.log(`📊 Tenants: ${tenantCount}, Events per Tenant: ${eventsPerTenant}`);
      console.log(`📊 Total Events: ${totalEvents}`);
      console.log(`⏱️  Average Duration: ${averageDuration.toFixed(2)}ms`);

      // Should maintain performance with concurrent tenant access
      expect(averageDuration).toBeLessThan(8);
      expect(totalDuration).toBeLessThan(2000); // 2 seconds total
    }, 10000);
  });
});
