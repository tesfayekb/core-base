
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantCustomization } from '../TenantCustomization';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import type { User, Session } from '@supabase/supabase-js';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock the tenant service
jest.mock('@/services/tenant/TenantCustomizationService', () => ({
  tenantCustomizationService: {
    getTenantCustomizations: jest.fn().mockResolvedValue([
      {
        id: '1',
        customization_type: 'theme',
        customization_key: 'primary_color',
        customization_value: { color: '#3b82f6' }
      }
    ]),
    setTenantCustomization: jest.fn().mockResolvedValue({})
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

describe('TenantCustomization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders customization interface', async () => {
    renderWithContext(<TenantCustomization />);
    
    expect(screen.getByText('Tenant Customization')).toBeInTheDocument();
    expect(screen.getByText('Customize your tenant settings')).toBeInTheDocument();
  });

  it('displays existing customizations', async () => {
    renderWithContext(<TenantCustomization />);
    
    await waitFor(() => {
      expect(screen.getByText('Current Customizations')).toBeInTheDocument();
    });
  });

  it('allows creating new customizations', async () => {
    const user = userEvent.setup();
    renderWithContext(<TenantCustomization />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Customization Type')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Customization Type'), 'theme');
    await user.type(screen.getByLabelText('Customization Key'), 'secondary_color');
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    const { tenantCustomizationService } = require('@/services/tenant/TenantCustomizationService');
    expect(tenantCustomizationService.setTenantCustomization).toHaveBeenCalled();
  });
});
