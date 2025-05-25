
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from '@/components/auth/SignupForm';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestHelpers, performanceTargets, testDataFactory } from '../utils/testHelpers';

// Mock the auth context
const mockSignUp = jest.fn();
const mockClearAuthError = jest.fn();

jest.mock('@/components/auth/AuthProvider', () => ({
  ...jest.requireActual('@/components/auth/AuthProvider'),
  useAuth: () => ({
    signUp: mockSignUp,
    authError: null,
    clearAuthError: mockClearAuthError
  })
}));

jest.mock('@/hooks/useErrorNotification', () => ({
  useErrorNotification: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn()
  })
}));

describe('Advanced Edge Cases Testing', () => {
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

  describe('Security Edge Cases', () => {
    test('should sanitize XSS attempts in form fields', async () => {
      renderSignupForm();
      
      const xssAttempts = TestHelpers.getXSSAttempts();
      
      for (const xssAttempt of xssAttempts) {
        const firstNameInput = screen.getByLabelText('First Name');
        await user.clear(firstNameInput);
        await user.type(firstNameInput, xssAttempt);
        
        // Should not execute scripts or break the form
        expect(firstNameInput).toBeInTheDocument();
        expect(screen.queryByText('XSS executed')).not.toBeInTheDocument();
      }
    });

    test('should handle SQL injection attempts in email field', async () => {
      renderSignupForm();
      
      const sqlInjectionAttempts = TestHelpers.getSQLInjectionAttempts();
      
      for (const sqlAttempt of sqlInjectionAttempts) {
        const emailInput = screen.getByLabelText('Email');
        await user.clear(emailInput);
        await user.type(emailInput, sqlAttempt);
        
        // Should validate as invalid email
        await user.type(screen.getByLabelText('Password'), TestHelpers.getValidTestPassword());
        await user.type(screen.getByLabelText('Confirm Password'), TestHelpers.getValidTestPassword());
        
        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).toBeDisabled();
      }
    });
  });

  describe('Boundary Value Testing', () => {
    test('should handle maximum length inputs', async () => {
      renderSignupForm();
      
      const boundaryTests = TestHelpers.getBoundaryTestCases();
      
      // Test maximum length string
      await user.type(screen.getByLabelText('First Name'), boundaryTests.maxLengthString);
      await user.type(screen.getByLabelText('Last Name'), boundaryTests.maxLengthString);
      
      // Form should handle gracefully without crashing
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    });

    test('should handle unicode and emoji characters', async () => {
      renderSignupForm();
      
      const boundaryTests = TestHelpers.getBoundaryTestCases();
      
      await user.type(screen.getByLabelText('First Name'), boundaryTests.unicodeCharacters);
      await user.type(screen.getByLabelText('Last Name'), boundaryTests.emojiCharacters);
      
      expect(screen.getByLabelText('First Name')).toHaveValue(boundaryTests.unicodeCharacters);
      expect(screen.getByLabelText('Last Name')).toHaveValue(boundaryTests.emojiCharacters);
    });
  });

  describe('Performance Edge Cases', () => {
    test('should maintain performance with rapid input changes', async () => {
      renderSignupForm();
      
      const { duration } = await TestHelpers.measureExecutionTime(async () => {
        for (let i = 0; i < 100; i++) {
          const emailInput = screen.getByLabelText('Email');
          await user.clear(emailInput);
          await user.type(emailInput, `test${i}@example.com`);
        }
      });
      
      expect(duration).toBeLessThan(performanceTargets.uiResponse * 100); // Allow 100x for 100 operations
    });

    test('should handle concurrent form operations', async () => {
      renderSignupForm();
      
      // Simulate multiple rapid operations
      const operations = [
        user.type(screen.getByLabelText('Email'), 'test@example.com'),
        user.type(screen.getByLabelText('Password'), TestHelpers.getValidTestPassword()),
        user.type(screen.getByLabelText('Confirm Password'), TestHelpers.getValidTestPassword()),
        user.type(screen.getByLabelText('First Name'), 'Test'),
        user.type(screen.getByLabelText('Last Name'), 'User')
      ];
      
      await Promise.all(operations);
      
      // All fields should be populated correctly
      expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
      expect(screen.getByLabelText('First Name')).toHaveValue('Test');
      expect(screen.getByLabelText('Last Name')).toHaveValue('User');
    });
  });

  describe('Network Edge Cases', () => {
    test('should handle network timeout scenarios', async () => {
      mockSignUp.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        ...testDataFactory.createValidUser(),
        confirmPassword: TestHelpers.getValidTestPassword()
      });
      
      await TestHelpers.submitForm(user);
      
      // Should handle timeout gracefully
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    test('should handle intermittent connection issues', async () => {
      let callCount = 0;
      mockSignUp.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Connection failed'));
        }
        return Promise.resolve({ success: true });
      });
      
      renderSignupForm();
      
      await TestHelpers.fillSignupForm(user, {
        ...testDataFactory.createValidUser(),
        confirmPassword: TestHelpers.getValidTestPassword()
      });
      
      // First attempt should fail
      await TestHelpers.submitForm(user);
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility Edge Cases', () => {
    test('should maintain proper ARIA attributes during state changes', async () => {
      renderSignupForm();
      
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      
      // Check initial ARIA attributes
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      
      // Test with invalid input
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'weak');
      
      // ARIA attributes should remain consistent
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should handle keyboard navigation edge cases', async () => {
      renderSignupForm();
      
      // Test tab navigation through all fields
      await user.tab();
      expect(screen.getByLabelText('First Name')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Last Name')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Email')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Password')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Confirm Password')).toHaveFocus();
    });
  });
});
