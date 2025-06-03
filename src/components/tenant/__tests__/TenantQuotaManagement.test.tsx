import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TenantQuotaManagement } from '../TenantQuotaManagement';
import { AuthProvider } from '@/contexts/AuthContext';
import { MockedRouterProvider } from '@/tests/utils/testHelpers';

// Mock the useToast hook
jest.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('TenantQuotaManagement Component', () => {
  const mockTenantId = 'test-tenant-id';

  it('renders without crashing', () => {
    render(
      <AuthProvider>
        <MockedRouterProvider>
          <TenantQuotaManagement tenantId={mockTenantId} />
        </MockedRouterProvider>
      </AuthProvider>
    );
    expect(screen.getByText('Tenant Quota Management')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(
      <AuthProvider>
        <MockedRouterProvider>
          <TenantQuotaManagement tenantId={mockTenantId} />
        </MockedRouterProvider>
      </AuthProvider>
    );
    expect(screen.getByText('Loading quotas...')).toBeInTheDocument();
  });

  it('fetches and displays quotas', async () => {
    const mockQuotas = [
      { id: '1', name: 'Users', quota: 100, usage: 50, tenant_id: mockTenantId },
      { id: '2', name: 'Storage', quota: 1000, usage: 750, tenant_id: mockTenantId },
    ];

    jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      json: async () => mockQuotas,
      ok: true,
    } as Response));

    render(
      <AuthProvider>
        <MockedRouterProvider>
          <TenantQuotaManagement tenantId={mockTenantId} />
        </MockedRouterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });

    (global.fetch as jest.Mock).mockRestore();
  });

  it('allows editing and updating a quota', async () => {
    const mockQuotas = [
      { id: '1', name: 'Users', quota: 100, usage: 50, tenant_id: mockTenantId },
    ];

    jest.spyOn(global, 'fetch')
      .mockImplementationOnce(async () => ({
        json: async () => mockQuotas,
        ok: true,
      } as Response))
      .mockImplementationOnce(async () => ({ // Mock the update request
        json: async () => ({ ...mockQuotas[0], quota: 150 }),
        ok: true,
      } as Response));

    render(
      <AuthProvider>
        <MockedRouterProvider>
          <TenantQuotaManagement tenantId={mockTenantId} />
        </MockedRouterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    const quotaInput = screen.getByLabelText('Quota') as HTMLInputElement;
    fireEvent.change(quotaInput, { target: { value: '150' } });

    fireEvent.click(screen.getByRole('button', { name: 'Update Quota' }));

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    (global.fetch as jest.Mock).mockRestore();
  });

  it('displays an error message on failed quota fetch', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: false,
      statusText: 'Failed to fetch',
    } as Response));

    render(
      <AuthProvider>
        <MockedRouterProvider>
          <TenantQuotaManagement tenantId={mockTenantId} />
        </MockedRouterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load quotas')).toBeInTheDocument();
    });

    (global.fetch as jest.Mock).mockRestore();
  });
});
