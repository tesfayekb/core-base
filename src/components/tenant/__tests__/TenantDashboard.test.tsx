import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TenantDashboard } from '../TenantDashboard';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
    currentTenantId: 'test-tenant-id',
    isLoading: false,
  },
}
));

describe('TenantDashboard Component', () => {
  test('renders TenantDashboard without errors', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TenantDashboard />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tenant Dashboard')).toBeInTheDocument();
    });
  });
});
