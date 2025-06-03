import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TenantWorkflowManager } from '../TenantWorkflowManager';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    currentTenantId: 'test-tenant-id',
    isLoggedIn: true,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock the react-query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('TenantWorkflowManager Component', () => {
  test('renders the component', () => {
    renderWithClient(
      <AuthProvider>
        <TenantWorkflowManager />
      </AuthProvider>
    );
    expect(screen.getByText('Tenant Workflow Management')).toBeInTheDocument();
  });

  test('displays a message when no workflows are available', async () => {
    renderWithClient(
      <AuthProvider>
        <TenantWorkflowManager />
      </AuthProvider>
    );

    // Mock the fetchWorkflows function to return an empty array
    const mockFetchWorkflows = jest.fn().mockResolvedValue([]);
    (TenantWorkflowManager as any).__proto__.fetchWorkflows = mockFetchWorkflows;

    // Wait for the component to render and check for the message
    await waitFor(() => {
      expect(screen.getByText('No workflows available for this tenant.')).toBeInTheDocument();
    });
  });

  test('fetches and displays workflows', async () => {
    const mockWorkflows = [
      { id: '1', name: 'Workflow 1', description: 'Description 1', tenantId: 'test-tenant-id' },
      { id: '2', name: 'Workflow 2', description: 'Description 2', tenantId: 'test-tenant-id' },
    ];

    // Mock the fetchWorkflows function to return the mock workflows
    const mockFetchWorkflows = jest.fn().mockResolvedValue(mockWorkflows);
    (TenantWorkflowManager as any).__proto__.fetchWorkflows = mockFetchWorkflows;

    renderWithClient(
      <AuthProvider>
        <TenantWorkflowManager />
      </AuthProvider>
    );

    // Wait for the workflows to be displayed
    await waitFor(() => {
      expect(screen.getByText('Workflow 1')).toBeInTheDocument();
      expect(screen.getByText('Workflow 2')).toBeInTheDocument();
    });
  });

  test('handles workflow creation', async () => {
    renderWithClient(
      <AuthProvider>
        <TenantWorkflowManager />
      </AuthProvider>
    );

    // Mock the createWorkflow function
    const mockCreateWorkflow = jest.fn().mockResolvedValue({ id: '3', name: 'New Workflow', description: 'New Description', tenantId: 'test-tenant-id' });
    (TenantWorkflowManager as any).__proto__.createWorkflow = mockCreateWorkflow;

    // Find and click the "Create Workflow" button
    const createButton = screen.getByText('Create Workflow');
    fireEvent.click(createButton);

    // Wait for the form to appear
    await waitFor(() => {
      expect(screen.getByLabelText('Workflow Name')).toBeInTheDocument();
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Workflow Name'), { target: { value: 'New Workflow' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New Description' } });

    // Mock the window.confirm function
    window.confirm = jest.fn(() => true);

    // Submit the form
    const submitButton = screen.getByText('Save');
    fireEvent.click(submitButton);

    // Wait for the workflow to be created and displayed
    await waitFor(() => {
      expect(mockCreateWorkflow).toHaveBeenCalled();
      expect(screen.getByText('New Workflow')).toBeInTheDocument();
    });
  });

  test('handles workflow deletion', async () => {
    const mockWorkflows = [
      { id: '1', name: 'Workflow 1', description: 'Description 1', tenantId: 'test-tenant-id' },
    ];

    // Mock the fetchWorkflows function to return the mock workflows
    const mockFetchWorkflows = jest.fn().mockResolvedValue(mockWorkflows);
    (TenantWorkflowManager as any).__proto__.fetchWorkflows = mockFetchWorkflows;

    renderWithClient(
      <AuthProvider>
        <TenantWorkflowManager />
      </AuthProvider>
    );

    // Wait for the workflows to be displayed
    await waitFor(() => {
      expect(screen.getByText('Workflow 1')).toBeInTheDocument();
    });

    // Mock the deleteWorkflow function
    const mockDeleteWorkflow = jest.fn().mockResolvedValue(undefined);
    (TenantWorkflowManager as any).__proto__.deleteWorkflow = mockDeleteWorkflow;

    // Mock the window.confirm function
    window.confirm = jest.fn(() => true);

    // Find and click the "Delete" button
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Wait for the workflow to be deleted
    await waitFor(() => {
      expect(mockDeleteWorkflow).toHaveBeenCalledWith('1');
    });
  });
});
