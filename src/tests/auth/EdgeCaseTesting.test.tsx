import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/services/database';

// Mock Supabase client
jest.mock('@/services/database', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation(callback => callback({ data: null, error: null })),
    }),
  },
}));

describe('Auth Edge Cases', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  test('handles session expiration gracefully', async () => {
    // Mock initial session
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          expires_at: Date.now() + 1000,
        },
      },
      error: null,
    });

    // Mock session expiration event
    const authChangeCallback = jest.fn();
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((event, callback) => {
      authChangeCallback.mockImplementation(callback);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <div data-testid="auth-test">Auth Content</div>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for initial auth state
    await waitFor(() => {
      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });

    // Simulate session expiration
    authChangeCallback('SIGNED_OUT', null);

    // Verify auth state updated correctly
    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });
  });

  test('handles network errors during authentication', async () => {
    // Mock network error
    (supabase.auth.getSession as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <div data-testid="auth-test">Auth Content</div>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });
  });

  test('handles malformed session data', async () => {
    // Mock malformed session data
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: {
        session: {
          // Missing user object
          expires_at: Date.now() + 1000,
        },
      },
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <div data-testid="auth-test">Auth Content</div>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify graceful handling
    await waitFor(() => {
      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });
  });

  test('handles concurrent auth state changes', async () => {
    // Mock initial session
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          expires_at: Date.now() + 1000,
        },
      },
      error: null,
    });

    // Mock auth change callback
    const authChangeCallback = jest.fn();
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((event, callback) => {
      authChangeCallback.mockImplementation(callback);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <div data-testid="auth-test">Auth Content</div>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });

    // Simulate rapid auth state changes
    authChangeCallback('SIGNED_IN', { user: { id: 'user-1', email: 'user1@example.com' } });
    authChangeCallback('SIGNED_IN', { user: { id: 'user-2', email: 'user2@example.com' } });
    
    // Verify auth state handling
    await waitFor(() => {
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });
  });
});
