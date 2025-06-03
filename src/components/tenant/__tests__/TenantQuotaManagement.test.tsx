
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantQuotaManagement } from '../TenantQuotaManagement';
import { AuthProvider } from '@/components/auth/AuthProvider';

// Mock the hooks and services
vi.mock('@/hooks/tenant/useTenantQuotas', () => ({
  useTenantQuotas: () => ({
    quotas: [
      {
        id: 'quota-1',
        resource_type: 'storage',
        quota_limit: 1000,
        current_usage: 500,
        warning_threshold: 80
      }
    ],
    isLoading: false,
    error: null,
    updateQuota: vi.fn(),
    deleteQuota: vi.fn()
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

describe('TenantQuotaManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quota management interface', () => {
    render(
      <TestWrapper>
        <TenantQuotaManagement />
      </TestWrapper>
    );

    expect(screen.getByText('Quota Management')).toBeInTheDocument();
  });

  it('displays quota list', async () => {
    render(
      <TestWrapper>
        <TenantQuotaManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('storage')).toBeInTheDocument();
    });
  });
});
