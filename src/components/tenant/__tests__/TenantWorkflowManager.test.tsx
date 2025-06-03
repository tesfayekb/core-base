import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantWorkflowManager } from '../TenantWorkflowManager';
import { AuthProvider } from '@/components/auth/AuthProvider';

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

describe('TenantWorkflowManager', () => {
  it('renders workflow manager', () => {
    render(
      <TestWrapper>
        <TenantWorkflowManager />
      </TestWrapper>
    );

    expect(screen.getByText('Workflow Manager')).toBeInTheDocument();
  });
});
