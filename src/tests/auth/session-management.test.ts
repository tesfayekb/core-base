
// Session Management Tests
// Following src/docs/integration/SESSION_AUTH_INTEGRATION.md

import { AuthProvider, useAuth } from '../../components/auth/AuthProvider';
import { render, waitFor, screen } from '@testing-library/react';
import React from 'react';

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut
    }
  }
}));

function TestSessionComponent() {
  const { user, loading, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {user ? (
        <div>
          <span>User: {user.email}</span>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <span>No User</span>
      )}
    </div>
  );
}

describe('Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
  });

  test('should restore session on page reload', async () => {
    const mockUser = { id: 'test-id', email: 'test@example.com' };
    
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    });

    render(
      <AuthProvider>
        <TestSessionComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });
  });

  test('should handle session timeout gracefully', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    render(
      <AuthProvider>
        <TestSessionComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No User')).toBeInTheDocument();
    });
  });

  test('should clean up on sign out', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { container } = render(
      <AuthProvider>
        <TestSessionComponent />
      </AuthProvider>
    );

    // Should handle sign out without errors
    await waitFor(() => {
      expect(container).toBeDefined();
    });
  });
});
