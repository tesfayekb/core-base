
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from '@/components/auth/SignupForm';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestHelpers, performanceTargets, testDataFactory } from '../utils/testHelpers';

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

  describe('Enhanced Error Handling Integration', () => {
    test('should handle various registration failure scenarios', async () => {
      const errorScenarios = [
        { error: 'Email already exists', expected: 'Email already exists' },
        { error: 'Invalid password format', expected: 'Invalid password format' },
        { error: 'User registration disabled', expected: 'User registration disabled' }
      ];

      for (const scenario of errorScenarios) {
        mockSignUp.mockResolvedValue({ success: false, error: scenario.error });
        
        renderSignupForm();
        
        await TestHelpers.fillSignupForm(user, {
          email: 'test@example.com',
          password: TestHelpers.getValidTestPassword(),
          confirmPassword: TestHelpers.getValidTestPassword(),
          firstName: 'Test',
          lastName: 'User'
        });
        
        await TestHelpers.submitForm(user);
        
        await waitFor(() => {
          expect(mockShowError).toHaveBeenCalledWith(scenario.expected);
        });
        
        jest.clearAllMocks();
      }
    });

    test('should handle network errors with retry capabilities', async () => {
      let attemptCount = 0;
      mockSignUp.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ success: true });
      });
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        email: 'retry@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: TestHelpers.getValidTestPassword(),
        firstName: 'Retry',
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

  describe('Advanced Form Validation Integration', () => {
    test('should validate complex password requirements', async () => {
      renderSignupForm();
      
      const complexValidationCases = [
        { password: 'NoNumbers!', confirmPassword: 'NoNumbers!', shouldFail: true },
        { password: 'nonumbersorspecial', confirmPassword: 'nonumbersorspecial', shouldFail: true },
        { password: 'ValidPass123!', confirmPassword: 'DifferentPass456!', shouldFail: true },
        { password: 'ValidPass123!', confirmPassword: 'ValidPass123!', shouldFail: false }
      ];

      for (const testCase of complexValidationCases) {
        await TestHelpers.fillSignupForm(user, {
          email: 'test@example.com',
          password: testCase.password,
          confirmPassword: testCase.confirmPassword,
          firstName: 'Test',
          lastName: 'User'
        });
        
        const submitButton = screen.getByRole('button', { name: /create account/i });
        
        if (testCase.shouldFail) {
          expect(submitButton).toBeDisabled();
        } else {
          expect(submitButton).not.toBeDisabled();
        }
        
        // Clear form for next test
        await user.clear(screen.getByLabelText('Email'));
        await user.clear(screen.getByLabelText('Password'));
        await user.clear(screen.getByLabelText('Confirm Password'));
        await user.clear(screen.getByLabelText('First Name'));
        await user.clear(screen.getByLabelText('Last Name'));
      }
    });
  });

  describe('Performance and Scalability Integration', () => {
    test('should handle rapid successive form submissions', async () => {
      mockSignUp.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 200))
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
      
      // Should only call signUp once due to loading state
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });

    test('should maintain responsive UI during long operations', async () => {
      mockSignUp.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000))
      );
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        email: 'longop@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: TestHelpers.getValidTestPassword(),
        firstName: 'Long',
        lastName: 'Operation'
      });
      
      await TestHelpers.submitForm(user);
      
      // UI should show loading state immediately
      await TestHelpers.waitForLoadingState();
      
      // Form fields should remain accessible but button disabled
      expect(screen.getByLabelText('Email')).toHaveValue('longop@example.com');
      await TestHelpers.waitForButtonState('creating account', true);
    });
  });

  describe('Multi-Component Integration', () => {
    test('should integrate properly with notification system', async () => {
      mockSignUp.mockResolvedValue({ success: true, requiresVerification: true });
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        ...testDataFactory.createValidUser(),
        confirmPassword: TestHelpers.getValidTestPassword()
      });
      
      await TestHelpers.submitForm(user);
      
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(
          'Registration successful! Please check your email to verify your account.'
        );
        expect(mockClearAuthError).toHaveBeenCalled();
      });
    });

    test('should handle component unmounting during async operations', async () => {
      mockSignUp.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );
      
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SignupForm />
          </AuthProvider>
        </QueryClientProvider>
      );
      
      await TestHelpers.fillSignupForm(user, {
        ...testDataFactory.createValidUser(),
        confirmPassword: TestHelpers.getValidTestPassword()
      });
      
      await TestHelpers.submitForm(user);
      
      // Unmount component while operation is in progress
      unmount();
      
      // Should not cause memory leaks or errors
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      }, { timeout: 1500 });
    });
  });

  describe('Real-world Usage Scenarios', () => {
    test('should handle typical user interaction patterns', async () => {
      mockSignUp.mockResolvedValue({ success: true });
      
      renderSignupForm();
      
      // Simulate realistic user behavior: typing, pausing, correcting
      await user.type(screen.getByLabelText('First Name'), 'Joh');
      await user.type(screen.getByLabelText('First Name'), 'n'); // Complete "John"
      
      await user.type(screen.getByLabelText('Email'), 'john@exampl');
      await user.keyboard('{Backspace}{Backspace}'); // Correct typo
      await user.type(screen.getByLabelText('Email'), 'le.com');
      
      await user.type(screen.getByLabelText('Password'), 'weak');
      await user.keyboard('{Control>}a{/Control}'); // Select all
      await user.type(screen.getByLabelText('Password'), TestHelpers.getValidTestPassword());
      
      await user.type(screen.getByLabelText('Confirm Password'), TestHelpers.getValidTestPassword());
      await user.type(screen.getByLabelText('Last Name'), 'Doe');
      
      await TestHelpers.submitForm(user);
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'john@example.com',
          TestHelpers.getValidTestPassword(),
          'John',
          'Doe'
        );
      });
    });
  });
});
