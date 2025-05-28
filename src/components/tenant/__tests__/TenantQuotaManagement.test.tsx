
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantQuotaManagement } from '../TenantQuotaManagement';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import type { User, Session } from '@supabase/supabase-js';

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

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00Z'
};

const mockSession: Session = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser
};

const mockAuthContext = {
  user: mockUser,
  session: mockSession,
  tenantId: 'tenant-1',
  currentTenantId: 'tenant-1',
  loading: false,
  isLoading: false,
  authError: null,
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  logout: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
  switchTenant: jest.fn(),
  isAuthenticated: true,
  clearAuthError: jest.fn()
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
