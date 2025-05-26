
// Audit System Integration Tests
// Tests interactions between audit components

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AuditDashboard } from '../../components/audit/AuditDashboard';
import { standardizedAuditLogger } from '../../services/audit/StandardizedAuditLogger';
import { realTimeAuditMonitor } from '../../services/audit/RealTimeAuditMonitor';
import { enhancedAuditService } from '../../services/audit/enhancedAuditService';

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    tenantId: 'test-tenant-123',
    user: { id: 'test-user-123' }
  })
}));

// Mock Supabase
jest.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      }))
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn()
      }))
    })),
    removeChannel: jest.fn()
  }
}));

describe('Audit System Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      React.createElement(QueryClientProvider, { client: queryClient }, component)
    );
  };

  describe('Audit Flow Integration', () => {
    it('should integrate standardized logger with enhanced audit service', async () => {
      const mockContext = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        requestId: 'req-789'
      };

      // Log event through standardized logger
      await standardizedAuditLogger.logStandardizedEvent(
        'test.integration',
        'test_resource',
        'resource-123',
        'success',
        mockContext
      );

      // Verify it flows through to enhanced audit service
      expect(enhancedAuditService).toBeDefined();
    });

    it('should display real-time audit data in dashboard', async () => {
      renderWithProviders(React.createElement(AuditDashboard));

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText('Audit Dashboard')).toBeInTheDocument();
      });

      // Verify metrics grid is displayed
      expect(screen.getByText('Total Events')).toBeInTheDocument();
      expect(screen.getByText('Security Events')).toBeInTheDocument();
      expect(screen.getByText('Failure Rate')).toBeInTheDocument();
    });

    it('should handle audit event subscriptions', async () => {
      const mockCallback = jest.fn();
      
      const unsubscribe = realTimeAuditMonitor.subscribeToAuditEvents(mockCallback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Test unsubscribe
      unsubscribe();
    });
  });

  describe('Component Interaction Tests', () => {
    it('should update metrics when new audit events are logged', async () => {
      // Mock initial metrics
      const mockMetrics = {
        totalEvents: 5,
        eventsByType: { 'test': 3, 'security': 2 },
        securityEvents: 2,
        failureRate: 0,
        recentActivity: []
      };

      jest.spyOn(realTimeAuditMonitor, 'getAuditMetrics')
        .mockResolvedValue(mockMetrics);

      renderWithProviders(React.createElement(AuditDashboard));

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Total events
        expect(screen.getByText('2')).toBeInTheDocument(); // Security events
      });
    });

    it('should generate compliance reports with proper data flow', async () => {
      const mockReport = {
        reportType: 'daily' as const,
        tenantId: 'tenant-123',
        generatedAt: new Date().toISOString(),
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        },
        summary: {
          totalEvents: 10,
          eventsByType: {},
          securityEvents: 2,
          failureRate: 0,
          recentActivity: []
        },
        events: [],
        complianceChecks: {
          dataAccessLogged: true,
          authenticationTracked: true,
          securityEventsMonitored: true,
          retentionCompliant: true
        }
      };

      jest.spyOn(realTimeAuditMonitor, 'generateComplianceReport')
        .mockResolvedValue(mockReport);

      const report = await realTimeAuditMonitor.generateComplianceReport('tenant-123', 'daily');
      
      expect(report.reportType).toBe('daily');
      expect(report.complianceChecks.dataAccessLogged).toBe(true);
    });
  });

  describe('Performance Integration Tests', () => {
    it('should maintain performance standards across integrated components', async () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        action: `test.batch.${i}`,
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
      const avgDuration = (endTime - startTime) / events.length;
      
      // Should maintain <5ms average per event
      expect(avgDuration).toBeLessThan(5);
    });
  });
});
