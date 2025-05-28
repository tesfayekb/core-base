
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantQuotaManagement } from '../TenantQuotaManagement';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock the tenant quota service
jest.mock('@/services/tenant/TenantQuotaService', () => ({
  tenantQuotaService: {
    getTenantQuotas: jest.fn().mockResolvedValue([
      {
        id: '1',
        resource_type: 'users',
        quota_limit: 100,
        warning_threshold: 80,
        hard_limit: true
      }
    ]),
    getTenantUsage: jest.fn().mockResolvedValue([
      {
        id: '1',
        resource_type: 'users',
        current_usage: 50
      }
    ]),
    setTenantQuota: jest.fn().mockResolvedValue({})
  }
}));

const mockAuthContext = {
  user: { id: 'user-1', email: 'test@example.com' },
  tenantId: 'tenant-1',
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

describe('TenantQuotaManagement', () => {
  it('renders quota management interface', async () => {
    renderWithContext(<TenantQuotaManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Quota Management')).toBeInTheDocument();
      expect(screen.getByText('Create New Quota')).toBeInTheDocument();
    });
  });

  it('displays existing quotas', async () => {
    renderWithContext(<TenantQuotaManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Current Quotas')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
  });

  it('allows creating new quotas', async () => {
    const user = userEvent.setup();
    renderWithContext(<TenantQuotaManagement />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Resource Type')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Resource Type'), 'storage_mb');
    await user.type(screen.getByLabelText('Quota Limit'), '1000');
    
    const createButton = screen.getByRole('button', { name: /create quota/i });
    await user.click(createButton);

    // Verify the service was called
    const { tenantQuotaService } = require('@/services/tenant/TenantQuotaService');
    expect(tenantQuotaService.setTenantQuota).toHaveBeenCalled();
  });

  it('shows usage progress bars', async () => {
    renderWithContext(<TenantQuotaManagement />);
    
    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });
});
