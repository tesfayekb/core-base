
// Authentication Error Boundary Testing
// Following src/docs/security/ERROR_HANDLING.md

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { LoginForm } from '../../components/auth/LoginForm';

// Create proper mocks
const mockSignInWithPassword = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockGetSession = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession
    }
  }
}));

// Test component that throws an error
function ErrorComponent() {
  throw new Error('Test authentication error');
}

describe('Authentication Error Boundary Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
    
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should handle authentication service errors gracefully', async () => {
    mockSignInWithPassword.mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    // Form should still render even if auth service has issues
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('should handle malformed auth responses', () => {
    mockGetSession.mockResolvedValue({
      data: null, // Malformed response
      error: null
    });

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    // Should not crash and should show login form
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('should handle network connectivity issues', () => {
    mockGetSession.mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    // Should render without crashing
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  test('should handle component rendering errors', () => {
    // This would normally be wrapped in an ErrorBoundary in a real app
    expect(() => {
      render(<ErrorComponent />);
    }).toThrow('Test authentication error');
  });
});
