
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from '@/components/auth/SignupForm';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestHelpers } from '../utils/testHelpers';

// Mock the entire auth system
const mockSignUp = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockClearAuthError = jest.fn();

jest.mock('@/components/auth/AuthProvider', () => ({
  ...jest.requireActual('@/components/auth/AuthProvider'),
  useAuth: () => ({
    signUp: mockSignUp,
    signIn: mockSignIn,
    signOut: mockSignOut,
    authError: null,
    clearAuthError: mockClearAuthError,
    user: null,
    loading: false
  })
}));

// Mock error notifications
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();

jest.mock('@/hooks/useErrorNotification', () => ({
  useErrorNotification: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess
  })
}));

describe('Comprehensive Auth Integration Tests', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  const renderSignupForm = () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SignupForm />
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  describe('Complete Registration Flow', () => {
    test('should complete full registration process successfully', async () => {
      mockSignUp.mockResolvedValue({ success: true, requiresVerification: false });
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        email: 'newuser@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: TestHelpers.getValidTestPassword(),
        firstName: 'New',
        lastName: 'User'
      });
      
      await TestHelpers.submitForm(user);
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'newuser@example.com',
          TestHelpers.getValidTestPassword(),
          'New',
          'User'
        );
        expect(mockShowSuccess).toHaveBeenCalledWith('Registration successful!');
      });
    });

    test('should handle registration with email verification', async () => {
      mockSignUp.mockResolvedValue({ success: true, requiresVerification: true });
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        email: 'verify@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: TestHelpers.getValidTestPassword(),
        firstName: 'Verify',
        lastName: 'User'
      });
      
      await TestHelpers.submitForm(user);
      
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(
          'Registration successful! Please check your email to verify your account.'
        );
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle registration failure gracefully', async () => {
      mockSignUp.mockResolvedValue({ success: false, error: 'Email already exists' });
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        email: 'existing@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: TestHelpers.getValidTestPassword(),
        firstName: 'Existing',
        lastName: 'User'
      });
      
      await TestHelpers.submitForm(user);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Email already exists');
      });
    });

    test('should handle network errors during registration', async () => {
      mockSignUp.mockRejectedValue(new Error('Network error'));
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        email: 'network@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: TestHelpers.getValidTestPassword(),
        firstName: 'Network',
        lastName: 'User'
      });
      
      await TestHelpers.submitForm(user);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'An unexpected error occurred during registration'
        );
      });
    });
  });

  describe('Form Validation Integration', () => {
    test('should prevent submission with invalid form data', async () => {
      renderSignupForm();
      
      // Try to submit with mismatched passwords
      await TestHelpers.fillSignupForm(user, {
        email: 'test@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: 'DifferentPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });
      
      await TestHelpers.submitForm(user);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Passwords do not match');
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    test('should prevent submission with weak password', async () => {
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        firstName: 'Test',
        lastName: 'User'
      });
      
      await TestHelpers.submitForm(user);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Password does not meet security requirements'
        );
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });
  });

  describe('Performance Integration', () => {
    test('should handle multiple rapid form submissions', async () => {
      mockSignUp.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        email: 'rapid@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: TestHelpers.getValidTestPassword(),
        firstName: 'Rapid',
        lastName: 'User'
      });
      
      // Try to submit multiple times rapidly
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);
      
      // Should only call signUp once
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });

  describe('State Management Integration', () => {
    test('should maintain form state during async operations', async () => {
      mockSignUp.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
      );
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        email: 'state@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: TestHelpers.getValidTestPassword(),
        firstName: 'State',
        lastName: 'User'
      });
      
      await TestHelpers.submitForm(user);
      
      // Form fields should maintain their values during submission
      expect(screen.getByLabelText('Email')).toHaveValue('state@example.com');
      expect(screen.getByLabelText('First Name')).toHaveValue('State');
      expect(screen.getByLabelText('Last Name')).toHaveValue('User');
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('Cross-browser Compatibility', () => {
    test('should handle different input event patterns', async () => {
      renderSignupForm();
      
      const emailInput = screen.getByLabelText('Email');
      
      // Simulate different ways users might input data
      await user.type(emailInput, 'test');
      await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}');
      await user.type(emailInput, 'crossbrowser@example.com');
      
      expect(emailInput).toHaveValue('crossbrowser@example.com');
    });
  });
});
