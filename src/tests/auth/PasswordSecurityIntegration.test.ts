
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { PasswordResetForm } from '../../components/auth/PasswordResetForm';
import { SignupForm } from '../../components/auth/SignupForm';
import { passwordResetRateLimitService } from '../../services/auth/PasswordResetRateLimitService';

// Mock dependencies
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

describe('Password Security Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
    
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    // Clear rate limiting state
    const service = passwordResetRateLimitService as any;
    service.resetAttempts.clear();
  });

  describe('End-to-End Password Security Flow', () => {
    test('should complete full password security workflow', async () => {
      const user = userEvent.setup();

      // 1. User registers with weak password - should fail
      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText(/Password/);
      const confirmInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(emailInput, 'integration@example.com');
      await user.type(passwordInput, 'weak');
      await user.type(confirmInput, 'weak');

      expect(submitButton).toBeDisabled(); // Should be disabled due to weak password

      // 2. User enters strong password - should succeed
      await user.clear(passwordInput);
      await user.clear(confirmInput);
      await user.type(passwordInput, 'SecurePassword123!');
      await user.type(confirmInput, 'SecurePassword123!');

      mockSignUp.mockResolvedValue({
        data: { 
          user: { id: 'test-id', email: 'integration@example.com' }, 
          session: null 
        },
        error: null
      });

      expect(submitButton).not.toBeDisabled();
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'integration@example.com',
          password: 'SecurePassword123!',
          options: {
            data: {
              first_name: '',
              last_name: '',
              full_name: ''
            }
          }
        });
      });
    });

    test('should handle password reset with rate limiting', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <PasswordResetForm />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: 'Send Reset Instructions' });

      // First reset attempt - should succeed
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      await user.type(emailInput, 'reset@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
          'reset@example.com',
          { redirectTo: `${window.location.origin}/reset-password` }
        );
      });

      // Simulate multiple rapid attempts
      for (let i = 0; i < 3; i++) {
        passwordResetRateLimitService.recordResetAttempt('reset@example.com');
      }

      // Re-render to show rate limiting
      render(
        <AuthProvider>
          <PasswordResetForm />
        </AuthProvider>
      );

      const newEmailInput = screen.getByLabelText('Email');
      const newSubmitButton = screen.getByRole('button', { name: 'Send Reset Instructions' });

      await user.type(newEmailInput, 'reset@example.com');

      // Should show rate limiting message and disable button
      expect(screen.getByText('Too many password reset requests')).toBeInTheDocument();
      expect(newSubmitButton).toBeDisabled();
    });
  });

  describe('Password Strength Integration', () => {
    test('should show real-time password strength feedback', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      const passwordInput = screen.getByLabelText(/Password/);

      // Start with empty password - no indicator
      expect(screen.queryByText('Password strength')).not.toBeInTheDocument();

      // Enter weak password
      await user.type(passwordInput, 'weak');
      
      await waitFor(() => {
        expect(screen.getByText('Password strength')).toBeInTheDocument();
        expect(screen.getByText('Weak')).toBeInTheDocument();
      });

      // Improve to strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'VerySecurePassword123!@#');

      await waitFor(() => {
        expect(screen.getByText('Strong')).toBeInTheDocument();
      });
    });

    test('should validate password confirmation matching', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      const passwordInput = screen.getByLabelText(/Password/);
      const confirmInput = screen.getByLabelText('Confirm Password');

      await user.type(passwordInput, 'SecurePassword123!');
      await user.type(confirmInput, 'DifferentPassword123!');

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });

      // Fix the mismatch
      await user.clear(confirmInput);
      await user.type(confirmInput, 'SecurePassword123!');

      await waitFor(() => {
        expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from network errors gracefully', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText(/Password/);
      const confirmInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      // Fill form
      await user.type(emailInput, 'error@example.com');
      await user.type(passwordInput, 'SecurePassword123!');
      await user.type(confirmInput, 'SecurePassword123!');

      // First attempt fails
      mockSignUp.mockRejectedValue(new Error('Network error'));

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred during registration')).toBeInTheDocument();
      });

      // Second attempt succeeds
      mockSignUp.mockResolvedValue({
        data: { 
          user: { id: 'test-id', email: 'error@example.com' }, 
          session: null 
        },
        error: null
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance Integration', () => {
    test('should handle password validation without blocking UI', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      );

      const passwordInput = screen.getByLabelText(/Password/);

      const startTime = performance.now();

      // Type complex password that requires extensive validation
      await user.type(passwordInput, 'ComplexPassword123!@#$%^&*()');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete validation quickly (within reasonable time)
      expect(duration).toBeLessThan(1000); // 1 second max

      // UI should remain responsive
      expect(passwordInput).not.toBeDisabled();
    });
  });
});
