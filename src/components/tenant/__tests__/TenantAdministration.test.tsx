import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TenantAdministration } from '../TenantAdministration';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const renderWithAuthProvider = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('TenantAdministration Component', () => {
  test('renders TenantAdministration component', () => {
    renderWithAuthProvider(<TenantAdministration />);
    expect(screen.getByText('Tenant Administration')).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    renderWithAuthProvider(<TenantAdministration />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders tenant details after loading', async () => {
    renderWithAuthProvider(<TenantAdministration />);
    await waitFor(() => {
      expect(screen.getByText(/Tenant ID:/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('allows navigation to Tenant Customization', async () => {
    renderWithAuthProvider(<TenantAdministration />);
    await waitFor(() => {
      expect(screen.getByText(/Tenant ID:/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByText('Customization'));
    await waitFor(() => {
      expect(screen.getByText('Customize Your Tenant')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('allows navigation to Tenant Metrics', async () => {
    renderWithAuthProvider(<TenantAdministration />);
    await waitFor(() => {
      expect(screen.getByText(/Tenant ID:/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByText('Metrics'));
    await waitFor(() => {
      expect(screen.getByText('Tenant Metrics Dashboard')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('allows navigation to Tenant Quota Management', async () => {
    renderWithAuthProvider(<TenantAdministration />);
    await waitFor(() => {
      expect(screen.getByText(/Tenant ID:/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByText('Quota Management'));
    await waitFor(() => {
      expect(screen.getByText('Manage Tenant Quotas')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('allows navigation to Tenant Workflow Manager', async () => {
    renderWithAuthProvider(<TenantAdministration />);
    await waitFor(() => {
      expect(screen.getByText(/Tenant ID:/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByText('Workflow Manager'));
    await waitFor(() => {
      expect(screen.getByText('Tenant Workflow Management')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
