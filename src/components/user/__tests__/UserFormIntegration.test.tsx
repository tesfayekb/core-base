
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserForm } from '../UserForm';
import { AuthContext } from '@/contexts/AuthContext';

// Mock the services
jest.mock('@/services/user/UserManagementService');
jest.mock('@/integrations/supabase/client');

const mockAuthUser = {
  id: 'auth-user-123',
  email: 'admin@example.com'
};

const mockAuthContext = {
  user: mockAuthUser,
  session: null,
  tenantId: 'tenant-123',
  currentTenantId: 'tenant-123',
  loading: false,
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
  authError: null,
  clearAuthError: jest.fn()
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('UserForm Integration Tests', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render create user form', async () => {
    render(
      <TestWrapper>
        <UserForm onClose={mockOnClose} tenantId="tenant-123" />
      </TestWrapper>
    );

    expect(screen.getByText('Create User')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
  });

  test('should validate required fields', async () => {
    render(
      <TestWrapper>
        <UserForm onClose={mockOnClose} tenantId="tenant-123" />
      </TestWrapper>
    );

    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  test('should validate email format', async () => {
    render(
      <TestWrapper>
        <UserForm onClose={mockOnClose} tenantId="tenant-123" />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  test('should handle form submission for new user', async () => {
    const mockCreateUser = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'new-user-123' }
    });

    // Mock the service
    require('@/services/user/UserManagementService').userManagementService = {
      createUser: mockCreateUser
    };

    render(
      <TestWrapper>
        <UserForm onClose={mockOnClose} tenantId="tenant-123" />
      </TestWrapper>
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'newuser@example.com' }
    });
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'New' }
    });
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'User' }
    });

    // Submit form
    fireEvent.click(screen.getByText('Create User'));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          tenantId: 'tenant-123'
        }),
        mockAuthUser.id
      );
    });
  });
});
