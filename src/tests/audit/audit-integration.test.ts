import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { MockedSupabaseProvider } from '../utils/MockedSupabaseProvider';
import { RealTimeAuditMonitor } from '@/components/audit/RealTimeAuditMonitor';
import { AuditDashboard } from '@/components/audit/AuditDashboard';
import { SecurityThreatsPanel } from '@/components/audit/SecurityThreatsPanel';
import { StandardizedAuditLogger } from '@/services/audit/StandardizedAuditLogger';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => {
  const mockSupabase = {
    from: jest.fn(() => mockSupabase),
    select: jest.fn(() => mockSupabase),
    eq: jest.fn(() => mockSupabase),
    order: jest.fn(() => mockSupabase),
    realtime: {
      subscribe: jest.fn(() => ({
        on: jest.fn(() => ({
          subscribe: jest.fn()
        }))
      }))
    }
  };
  return { supabase: mockSupabase };
});

describe('Audit Integration Tests', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  test('RealTimeAuditMonitor renders without errors', async () => {
    render(
      <MockedSupabaseProvider>
        <AuthProvider>
          <RealTimeAuditMonitor />
        </AuthProvider>
      </MockedSupabaseProvider>
    );
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Real-Time Audit Events')).toBeInTheDocument();
    });
  });

  test('AuditDashboard renders without errors', async () => {
    render(
      <MockedSupabaseProvider>
        <AuthProvider>
          <AuditDashboard />
        </AuthProvider>
      </MockedSupabaseProvider>
    );
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Audit Dashboard')).toBeInTheDocument();
    });
  });

  test('SecurityThreatsPanel renders without errors', async () => {
    render(
      <MockedSupabaseProvider>
        <AuthProvider>
          <SecurityThreatsPanel />
        </AuthProvider>
      </MockedSupabaseProvider>
    );
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Security Threats')).toBeInTheDocument();
    });
  });

  test('StandardizedAuditLogger logs an event', async () => {
    const mockLogger = new StandardizedAuditLogger();
    const mockEvent = {
      event_type: 'test_event',
      user_id: 'test_user',
      tenant_id: 'test_tenant',
      timestamp: new Date().toISOString(),
      details: { message: 'This is a test event' }
    };
    
    // Mock the insert function
    const mockSupabaseInsert = jest.fn().mockResolvedValue({ data: [mockEvent], error: null });
    (createClient() as any).from = jest.fn(() => ({
      insert: mockSupabaseInsert,
    }));

    await mockLogger.logEvent(mockEvent.event_type, mockEvent.user_id, mockEvent.tenant_id, mockEvent.details);

    // Wait for the logging to complete
    await waitFor(() => {
      expect(mockSupabaseInsert).toHaveBeenCalled();
    });
  });
});
