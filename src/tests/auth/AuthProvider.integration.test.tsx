import React from 'react';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

// Mock the Supabase client to control the authentication state during tests
jest.mock('@/integrations/supabase/client', () => {
  const originalModule = jest.requireActual('@/integrations/supabase/client');
  let mockUser: any = null;

  return {
    ...originalModule,
    supabase: {
      ...originalModule.supabase,
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: mockUser ? { user: mockUser } : null }, error: null })),
        getUser: jest.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
        onAuthStateChange: jest.fn(),
        signInWithOAuth: jest.fn(),
        signOut: jest.fn(),
        updateUser: jest.fn(),
      },
    },
  };
});

describe('AuthProvider Integration Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    // Reset mocks before each test
    (mockSupabase.auth.getSession as jest.Mock).mockClear();
    (mockSupabase.auth.getUser as jest.Mock).mockClear();
  });

  test('renders children when user is authenticated', async () => {
    const mockUser = {
      id: 'mock-user-id',
      email: 'test@example.com',
      role: 'authenticated',
    };

    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: mockUser } }, error: null });
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser }, error: null });

    render(
      <AuthProvider>
        <div>Authenticated Content</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Authenticated Content')).toBeInTheDocument();
    });
  });

  test('does not render children when user is not authenticated', async () => {
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null }, error: null });
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: null });

    render(
      <AuthProvider>
        <div>Authenticated Content</div>
      </AuthProvider>
    );

    // Use waitFor to allow AuthProvider to resolve the authentication state
    await waitFor(() => {
      expect(screen.queryByText('Authenticated Content')).toBeNull();
    });
  });

  test('updates context value when user signs in', async () => {
    const mockUser = {
      id: 'mock-user-id',
      email: 'test@example.com',
      role: 'authenticated',
    };

    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: mockUser } }, error: null });
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser }, error: null });

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('User ID: mock-user-id')).toBeInTheDocument();
      expect(screen.getByText('Email: test@example.com')).toBeInTheDocument();
    });

    // Simulate sign-out by resolving with null session
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null }, error: null });
    (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: null });

    // Rerender the component to reflect the updated authentication state
    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('User ID: mock-user-id')).toBeNull();
      expect(screen.queryByText('Email: test@example.com')).toBeNull();
    });
  });

  test('handles errors when fetching session', async () => {
    (mockSupabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Failed to fetch session'));

    render(
      <AuthProvider>
        <div>Authenticated Content</div>
      </AuthProvider>
    );

    // You might want to assert that an error message is displayed, or some fallback UI is rendered
    // For example, if you have an error boundary:
    // expect(screen.getByText('Error fetching session')).toBeInTheDocument();
  });

  // Helper component to access the AuthContext value
  const TestComponent = () => {
    const { user } = React.useContext(AuthProvider.context);
    return (
      <div>
        {user ? (
          <>
            <div>User ID: {user.id}</div>
            <div>Email: {user.email}</div>
          </>
        ) : (
          <div>Not Authenticated</div>
        )}
      </div>
    );
  };
});
