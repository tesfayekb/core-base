
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantWorkflowManager } from '../TenantWorkflowManager';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { createMockAuthContext } from './shared/MockAuthContext';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock the tenant workflow service
jest.mock('@/services/tenant/TenantWorkflowService', () => ({
  tenantWorkflowService: {
    getWorkflows: jest.fn().mockResolvedValue([
      {
        id: 'workflow-1',
        tenant_id: 'tenant-1',
        workflow_name: 'User Onboarding',
        workflow_type: 'automation',
        is_active: true,
        version: 1,
        created_at: '2024-01-15T10:00:00Z'
      }
    ]),
    createWorkflow: jest.fn().mockResolvedValue({}),
    toggleWorkflow: jest.fn().mockResolvedValue({}),
    deleteWorkflow: jest.fn().mockResolvedValue({})
  }
}));

const mockAuthContext = createMockAuthContext();

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

  it('renders workflow manager interface', async () => {
    renderWithContext(<TenantWorkflowManager />);
    
    expect(screen.getByText('Workflow Manager')).toBeInTheDocument();
    expect(screen.getByText('Manage automated workflows and processes')).toBeInTheDocument();
  });

  it('displays create workflow form', async () => {
    renderWithContext(<TenantWorkflowManager />);
    
    expect(screen.getByText('Create New Workflow')).toBeInTheDocument();
    expect(screen.getByLabelText('Workflow Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Workflow Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('allows creating a new workflow', async () => {
    const user = userEvent.setup();
    renderWithContext(<TenantWorkflowManager />);
    
    await user.type(screen.getByLabelText('Workflow Name'), 'Test Workflow');
    await user.type(screen.getByLabelText('Workflow Type'), 'automation');
    await user.type(screen.getByLabelText('Description'), 'Test description');
    
    const createButton = screen.getByRole('button', { name: /create workflow/i });
    await user.click(createButton);

    const { tenantWorkflowService } = require('@/services/tenant/TenantWorkflowService');
    expect(tenantWorkflowService.createWorkflow).toHaveBeenCalledWith(
      'tenant-1',
      'Test Workflow',
      'automation',
      { description: 'Test description' },
      [],
      []
    );
  });

  it('displays existing workflows', async () => {
    renderWithContext(<TenantWorkflowManager />);
    
    await waitFor(() => {
      expect(screen.getByText('User Onboarding')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('automation')).toBeInTheDocument();
    });
  });

  it('allows toggling workflow status', async () => {
    const user = userEvent.setup();
    renderWithContext(<TenantWorkflowManager />);
    
    await waitFor(() => {
      expect(screen.getByText('User Onboarding')).toBeInTheDocument();
    });

    const toggleSwitch = screen.getByRole('switch');
    await user.click(toggleSwitch);

    const { tenantWorkflowService } = require('@/services/tenant/TenantWorkflowService');
    expect(tenantWorkflowService.toggleWorkflow).toHaveBeenCalledWith('tenant-1', 'workflow-1', false);
  });

  it('allows deleting workflows', async () => {
    const user = userEvent.setup();
    renderWithContext(<TenantWorkflowManager />);
    
    await waitFor(() => {
      expect(screen.getByText('User Onboarding')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: '' }); // Trash icon button
    await user.click(deleteButton);

    const { tenantWorkflowService } = require('@/services/tenant/TenantWorkflowService');
    expect(tenantWorkflowService.deleteWorkflow).toHaveBeenCalledWith('tenant-1', 'workflow-1');
  });

  it('shows empty state when no workflows exist', async () => {
    const { tenantWorkflowService } = require('@/services/tenant/TenantWorkflowService');
    tenantWorkflowService.getWorkflows.mockResolvedValueOnce([]);
    
    renderWithContext(<TenantWorkflowManager />);
    
    await waitFor(() => {
      expect(screen.getByText('No workflows configured. Create your first workflow above.')).toBeInTheDocument();
    });
  });
});
