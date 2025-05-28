
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantWorkflowManager } from '../TenantWorkflowManager';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import type { User, Session } from '@supabase/supabase-js';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock the tenant workflow service
jest.mock('@/services/tenant/TenantWorkflowService', () => ({
  tenantWorkflowService: {
    getTenantWorkflows: jest.fn().mockResolvedValue([
      {
        id: '1',
        workflow_name: 'user_onboarding',
        workflow_type: 'automated',
        is_active: true
      }
    ]),
    createTenantWorkflow: jest.fn().mockResolvedValue({}),
    updateTenantWorkflow: jest.fn().mockResolvedValue({})
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

describe('TenantWorkflowManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workflow management interface', async () => {
    renderWithContext(<TenantWorkflowManager />);
    
    expect(screen.getByText('Workflow Management')).toBeInTheDocument();
    expect(screen.getByText('Manage automated workflows for your tenant')).toBeInTheDocument();
  });

  it('displays existing workflows', async () => {
    renderWithContext(<TenantWorkflowManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Workflows')).toBeInTheDocument();
      expect(screen.getByText('user_onboarding')).toBeInTheDocument();
    });
  });

  it('allows creating new workflows', async () => {
    const user = userEvent.setup();
    renderWithContext(<TenantWorkflowManager />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Workflow Name')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Workflow Name'), 'new_workflow');
    await user.selectOptions(screen.getByLabelText('Workflow Type'), 'manual');
    
    const createButton = screen.getByRole('button', { name: /create workflow/i });
    await user.click(createButton);

    const { tenantWorkflowService } = require('@/services/tenant/TenantWorkflowService');
    expect(tenantWorkflowService.createTenantWorkflow).toHaveBeenCalled();
  });

  it('shows workflow status toggles', async () => {
    renderWithContext(<TenantWorkflowManager />);
    
    await waitFor(() => {
      const toggles = screen.getAllByRole('switch');
      expect(toggles.length).toBeGreaterThan(0);
    });
  });
});
