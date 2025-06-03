
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantDashboard } from '../TenantDashboard';
import { AuthProvider } from '@/components/auth/AuthProvider';

// Mock the hooks and services
vi.mock('@/hooks/tenant/useTenantMetrics', () => ({
  useTenantMetrics: () => ({
    metrics: {
      userCount: 10,
      activeUsers: 8,
      storageUsed: 500,
      apiCalls: 1000
    },
    isLoading: false,
    error: null
  })
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: null,
    tenantId: 'tenant-1',
    currentTenantId: 'tenant-1',
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    refreshSession: vi.fn(),
    authError: null,
    clearAuthError: vi.fn(),
    switchTenant: vi.fn(),
    isAuthenticated: true
  })
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('TenantDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tenant dashboard', () => {
    render(
      <TestWrapper>
        <TenantDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Tenant Dashboard')).toBeInTheDocument();
  });
});
