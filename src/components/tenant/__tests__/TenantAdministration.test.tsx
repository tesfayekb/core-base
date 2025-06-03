
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantAdministration } from '../TenantAdministration';
import { AuthProvider } from '@/components/auth/AuthProvider';

// Mock the hooks and services
vi.mock('@/hooks/tenant/useTenantManagement', () => ({
  useTenantManagement: () => ({
    tenants: [
      {
        id: 'tenant-1',
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'active',
        created_at: '2023-01-01T00:00:00Z'
      }
    ],
    isLoading: false,
    error: null,
    createTenant: vi.fn(),
    updateTenant: vi.fn(),
    deleteTenant: vi.fn()
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

describe('TenantAdministration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tenant administration interface', () => {
    render(
      <TestWrapper>
        <TenantAdministration />
      </TestWrapper>
    );

    expect(screen.getByText('Tenant Administration')).toBeInTheDocument();
  });

  it('displays tenant list', async () => {
    render(
      <TestWrapper>
        <TenantAdministration />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    });
  });
});
