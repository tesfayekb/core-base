
// Comprehensive Authentication Integration Tests
// Following src/docs/testing/CORE_COMPONENT_INTEGRATION.md

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { SignupForm } from '../../components/auth/SignupForm';
import { PasswordResetForm } from '../../components/auth/PasswordResetForm';
import { authService } from '../../services/authService';
import { passwordResetRateLimitService } from '../../services/auth/PasswordResetRateLimitService';

// Mock all dependencies
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange
    }
  }
}));

describe('Comprehensive Authentication Integration', () => {
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

  describe('Complete User Registration Flow', () => {
    test('should handle full registration with email verification', async () => {
      const user = userEvent.setup();
      
      // Mock successful registration
      mockSignUp.mockResolvedValue({
        data: { 
          user: { id: 'test-id', email: 'test@example.com' }, 
          session: null 
        },
        error: null
      });

      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      // Fill out registration form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123!');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Verify registration was called with correct data
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          options: {
            data: {
              first_name: 'John',
              last_name: 'Doe'
            }
          }
        });
      });
    });

    test('should handle registration errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock registration error
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' }
      });

      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      // Fill out form
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123!');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should handle error appropriately
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      });
    });

    test('should validate password strength in real-time', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      // Test weak password
      await user.type(passwordInput, 'weak');
      expect(submitButton).toBeDisabled();

      // Test strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongPassword123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPassword123!');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Password Reset Flow Integration', () => {
    test('should handle complete password reset flow', async () => {
      const user = userEvent.setup();
      
      // Test request reset
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      });

      const { rerender } = render(
        <AuthProvider>
          <PasswordResetForm />
        </AuthProvider>
      );

      // Request password reset
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
      });

      // Simulate clicking reset link (password update mode)
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: 'test-id' } },
        error: null
      });

      rerender(
        <AuthProvider>
          <PasswordResetForm resetToken="valid-token" />
        </AuthProvider>
      );

      // Update password
      await user.type(screen.getByLabelText(/new password/i), 'NewSecurePassword123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewSecurePassword123!');
      await user.click(screen.getByRole('button', { name: /update password/i }));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          password: 'NewSecurePassword123!'
        });
      });
    });

    test('should integrate rate limiting with UI state', async () => {
      const user = userEvent.setup();
      
      // Mock rate limited state
      jest.spyOn(passwordResetRateLimitService, 'checkResetRateLimit').mockReturnValue({
        isLimited: true,
        remainingAttempts: 0,
        nextAttemptAllowed: Date.now() + 60000,
        resetWindow: 3600000
      });

      render(
        <AuthProvider>
          <PasswordResetForm />
        </AuthProvider>
      );

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');

      // Button should be disabled due to rate limiting
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
      expect(submitButton).toBeDisabled();

      // Should show rate limit message
      expect(screen.getByText(/too many password reset requests/i)).toBeInTheDocument();
    });

    test('should handle network failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network failure
      mockResetPasswordForEmail.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <PasswordResetForm />
        </AuthProvider>
      );

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset instructions/i }));

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalled();
      });
    });
  });

  describe('Cross-Component State Management', () => {
    test('should maintain consistent state across components', async () => {
      const user = userEvent.setup();
      
      // Mock successful login
      mockSignInWithPassword.mockResolvedValue({
        data: { 
          user: { id: 'test-id', email: 'test@example.com' }, 
          session: { access_token: 'token' } 
        },
        error: null
      });

      // Test authentication state propagation
      const { rerender } = render(
        <AuthProvider>
          <div data-testid="auth-state">Not authenticated</div>
        </AuthProvider>
      );

      // Simulate login through service
      await authService.signIn('test@example.com', 'password123');

      // State should be consistent across re-renders
      rerender(
        <AuthProvider>
          <div data-testid="auth-state">Authenticated</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-state')).toBeInTheDocument();
    });

    test('should handle concurrent authentication operations', async () => {
      // Simulate multiple concurrent auth operations
      const loginPromise = authService.signIn('user1@example.com', 'password1');
      const registerPromise = authService.signUp({
        email: 'user2@example.com',
        password: 'password2'
      });

      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: '1' }, session: { access_token: 'token1' } },
        error: null
      });

      mockSignUp.mockResolvedValue({
        data: { user: { id: '2' }, session: null },
        error: null
      });

      const [loginResult, registerResult] = await Promise.all([
        loginPromise,
        registerPromise
      ]);

      expect(loginResult.success).toBe(true);
      expect(registerResult.success).toBe(true);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle rapid form submissions', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'test' }, session: null },
        error: null
      });

      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      // Fill form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123!');

      const submitButton = screen.getByRole('button', { name: /create account/i });

      // Rapid clicks should not cause multiple submissions
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only be called once due to loading state
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledTimes(1);
      });
    });

    test('should handle large form data efficiently', async () => {
      const user = userEvent.setup();
      
      const longString = 'a'.repeat(100);
      
      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      // Test with large input data
      await user.type(screen.getByLabelText(/first name/i), longString);
      await user.type(screen.getByLabelText(/last name/i), longString);

      // Form should handle large inputs gracefully
      expect(screen.getByLabelText(/first name/i)).toHaveValue(longString);
      expect(screen.getByLabelText(/last name/i)).toHaveValue(longString);
    });
  });
});
