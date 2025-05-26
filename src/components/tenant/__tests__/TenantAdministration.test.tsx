
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantAdministration } from '../TenantAdministration';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock the tenant management service
jest.mock('@/services/tenant/TenantManagementService', () => ({
  tenantManagementService: {
    getAllTenants: jest.fn().mockResolvedValue([
      {
        id: 'tenant-1',
        name: 'Test Tenant',
        domain: 'test.com',
        status: 'active',
        settings: { maxUsers: 100 }
      }
    ]),
    getTenantHealth: jest.fn().mockResolvedValue({
      status: 'healthy',
      responseTime: 45,
      uptime: 99.9
    }),
    suspendTenant: jest.fn().mockResolvedValue({}),
    activateTenant: jest.fn().mockResolvedValue({})
  }
}));

const mockAuthContext = {
  user: { id: 'admin-1', email: 'admin@example.com' },
  tenantId: 'system-admin',
  login: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  loading: false
};

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('TenantAdministration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders administration interface', async () => {
    renderWithContext(<TenantAdministration />);
    
    expect(screen.getByText('System Administration')).toBeInTheDocument();
    expect(screen.getByText('Manage all tenants in the system')).toBeInTheDocument();
  });

  it('displays tenant overview data', async () => {
    renderWithContext(<TenantAdministration />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Tenants')).toBeInTheDocument();
      expect(screen.getByText('Active Tenants')).toBeInTheDocument();
      expect(screen.getByText('Health Score')).toBeInTheDocument();
    });
  });

  it('shows tenant list with management actions', async () => {
    renderWithContext(<TenantAdministration />);
    
    await waitFor(() => {
      expect(screen.getByText('All Tenants')).toBeInTheDocument();
      expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    });
  });

  it('allows suspending a tenant', async () => {
    const user = userEvent.setup();
    renderWithContext(<TenantAdministration />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    });

    const suspendButton = screen.getByRole('button', { name: /suspend/i });
    await user.click(suspendButton);

    const { tenantManagementService } = require('@/services/tenant/TenantManagementService');
    expect(tenantManagementService.suspendTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('displays system health monitoring', async () => {
    renderWithContext(<TenantAdministration />);
    
    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Response Time')).toBeInTheDocument();
    });
  });
});
