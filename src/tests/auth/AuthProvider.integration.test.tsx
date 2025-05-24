
// Authentication Provider Integration Tests
// Following src/docs/implementation/testing/CORE_TESTING_PATTERNS.md

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../components/auth/AuthProvider';
import { supabase } from '../../services/database';

// Mock Supabase
jest.mock('../../services/database');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Test component to access auth context
function TestComponent() {
  const { user, loading, signIn, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {user ? (
        <div>
          <span>Welcome {user.email}</span>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <button onClick={() => signIn('test@example.com', 'password')}>
          Sign In
        </button>
      )}
    </div>
  );
}

describe('AuthProvider Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth state subscription
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
    
    // Mock initial session
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });
  });

  test('should handle complete authentication flow', async () => {
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should show sign in button initially
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    // Mock successful login
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { 
        user: { id: 'test-id', email: 'test@example.com' }, 
        session: { access_token: 'token' } 
      },
      error: null
    });

    // Click sign in
    await user.click(screen.getByText('Sign In'));

    // Should show welcome message
    await waitFor(() => {
      expect(screen.getByText('Welcome test@example.com')).toBeInTheDocument();
    });
  });

  test('should handle tenant context integration', async () => {
    const mockUser = { id: 'test-id', email: 'test@example.com' };
    
    // Mock successful session
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should complete without errors (tenant context setup is non-blocking)
    await waitFor(() => {
      expect(screen.getByText('Welcome test@example.com')).toBeInTheDocument();
    });
  });
});
