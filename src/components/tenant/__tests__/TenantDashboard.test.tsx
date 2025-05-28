
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TenantDashboard } from '../TenantDashboard';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import type { User, Session } from '@supabase/supabase-js';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock the enhanced tenant management service
jest.mock('@/services/tenant/EnhancedTenantManagementService', () => ({
  enhancedTenantManagementService: {
    getTenantDashboardData: jest.fn().mockResolvedValue({
      tenant: { name: 'Test Tenant', domain: 'test.com', status: 'active' },
      totalQuotas: 5,
      warningQuotas: 1,
      quotaUsage: [
        {
          resource_type: 'users',
          current_usage: 50,
          quota_limit: 100,
          usage_percentage: 50,
          warning: false
        }
      ]
    })
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

describe('TenantDashboard', () => {
  it('renders tenant dashboard with loading state', () => {
    renderWithContext(<TenantDashboard />);
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('renders tenant dashboard with data', async () => {
    renderWithContext(<TenantDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Tenant Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome to Test Tenant')).toBeInTheDocument();
    });
  });

  it('displays quota information', async () => {
    renderWithContext(<TenantDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Quotas')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('shows resource quota overview', async () => {
    renderWithContext(<TenantDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Resource Quota Overview')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
  });
});
