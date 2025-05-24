
// Authentication End-to-End Tests
// Following src/docs/implementation/testing/PHASE1_CORE_TESTING.md

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { LoginForm } from '../../components/auth/LoginForm';

// Create proper mocks
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange
    }
  }
}));

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
    
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null
    });
  });

  test('should complete full authentication flow', async () => {
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    // Mock successful login
    mockSignInWithPassword.mockResolvedValue({
      data: { 
        user: { id: 'test-id', email: 'test@example.com' }, 
        session: { access_token: 'token' } 
      },
      error: null
    });

    // Fill in login form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Should call authentication service
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
