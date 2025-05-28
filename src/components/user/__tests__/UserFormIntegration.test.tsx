
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserForm } from '../UserForm';
import { AuthContext } from '@/contexts/AuthContext';
import type { User, Session } from '@supabase/supabase-js';

// Mock the services
jest.mock('@/services/user/UserManagementService');
jest.mock('@/integrations/supabase/client');

const mockUser: User = {
  id: 'auth-user-123',
  email: 'admin@example.com',
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
  tenantId: 'tenant-123',
  currentTenantId: 'tenant-123',
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
        mockUser.id
      );
    });
  });
});
