
// Password Security Integration Tests
// Following src/docs/implementation/testing/PHASE1_CORE_TESTING.md

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { PasswordResetForm } from '../../components/auth/PasswordResetForm';
import { passwordResetRateLimitService } from '../../services/auth/PasswordResetRateLimitService';

// Mock Supabase
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange
    }
  }
}));

// Mock the rate limit service
jest.mock('../../services/auth/PasswordResetRateLimitService');

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
    
    // Reset rate limit service mock
    const mockService = passwordResetRateLimitService as jest.Mocked<typeof passwordResetRateLimitService>;
    mockService.checkResetRateLimit.mockReturnValue({
      isLimited: false,
      remainingAttempts: 3,
      nextAttemptAllowed: Date.now(),
      resetWindow: 3600000
    });
  });

  describe('Password Reset Rate Limiting Integration', () => {
    test('should show rate limit notification when limited', async () => {
      const user = userEvent.setup();
      
      // Mock rate limit as active
      const mockService = passwordResetRateLimitService as jest.Mocked<typeof passwordResetRateLimitService>;
      mockService.checkResetRateLimit.mockReturnValue({
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

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      // Should show rate limit notification
      expect(screen.getByText(/too many password reset requests/i)).toBeInTheDocument();
    });

    test('should prevent form submission when rate limited', async () => {
      const user = userEvent.setup();
      
      // Mock rate limit as active
      const mockService = passwordResetRateLimitService as jest.Mocked<typeof passwordResetRateLimitService>;
      mockService.checkResetRateLimit.mockReturnValue({
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

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
      
      await user.type(emailInput, 'test@example.com');
      
      expect(submitButton).toBeDisabled();
    });

    test('should show remaining attempts warning', async () => {
      const user = userEvent.setup();
      
      // Mock rate limit with 1 attempt remaining
      const mockService = passwordResetRateLimitService as jest.Mocked<typeof passwordResetRateLimitService>;
      mockService.checkResetRateLimit.mockReturnValue({
        isLimited: false,
        remainingAttempts: 1,
        nextAttemptAllowed: Date.now(),
        resetWindow: 3600000
      });

      render(
        <AuthProvider>
          <PasswordResetForm />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      // Should show warning about remaining attempts
      expect(screen.getByText(/1 password reset attempt.*remaining/i)).toBeInTheDocument();
    });

    test('should record attempt and update rate limit status', async () => {
      const user = userEvent.setup();
      
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      });

      render(
        <AuthProvider>
          <PasswordResetForm />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        const mockService = passwordResetRateLimitService as jest.Mocked<typeof passwordResetRateLimitService>;
        expect(mockService.recordResetAttempt).toHaveBeenCalledWith('test@example.com');
      });
    });

    test('should handle rate limit countdown display', async () => {
      const user = userEvent.setup();
      
      // Mock rate limit with specific time remaining
      const mockService = passwordResetRateLimitService as jest.Mocked<typeof passwordResetRateLimitService>;
      mockService.checkResetRateLimit.mockReturnValue({
        isLimited: true,
        remainingAttempts: 0,
        nextAttemptAllowed: Date.now() + 120000, // 2 minutes
        resetWindow: 3600000
      });

      render(
        <AuthProvider>
          <PasswordResetForm />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      // Should show time remaining
      expect(screen.getByText(/wait.*2 minutes.*before trying again/i)).toBeInTheDocument();
    });

    test('should normalize email case for rate limiting', async () => {
      const user = userEvent.setup();
      
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      });

      render(
        <AuthProvider>
          <PasswordResetForm />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset instructions/i });
      
      await user.type(emailInput, 'TEST@EXAMPLE.COM');
      await user.click(submitButton);

      await waitFor(() => {
        const mockService = passwordResetRateLimitService as jest.Mocked<typeof passwordResetRateLimitService>;
        expect(mockService.recordResetAttempt).toHaveBeenCalledWith('TEST@EXAMPLE.COM');
      });
    });

    test('should integrate rate limiting with password strength validation', async () => {
      const user = userEvent.setup();

      render(
        <AuthProvider>
          <PasswordResetForm resetToken="valid-token" />
        </AuthProvider>
      );

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /update password/i });

      // Test with weak password
      await user.type(passwordInput, 'weak');
      await user.type(confirmInput, 'weak');

      expect(submitButton).toBeDisabled();

      // Clear and test with strong password
      await user.clear(passwordInput);
      await user.clear(confirmInput);
      await user.type(passwordInput, 'StrongPassword123!');
      await user.type(confirmInput, 'StrongPassword123!');

      expect(submitButton).not.toBeDisabled();
    });
  });
});
