
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from '@/components/auth/SignupForm';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestHelpers } from '../utils/testHelpers';

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

describe('SignupForm Edge Cases', () => {
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

  describe('Email Validation Edge Cases', () => {
    test('should handle various invalid email formats', async () => {
      renderSignupForm();
      
      const invalidEmails = TestHelpers.getInvalidEmails();
      
      for (const email of invalidEmails) {
        const emailInput = screen.getByLabelText('Email');
        await user.clear(emailInput);
        await user.type(emailInput, email);
        
        // Try to submit with invalid email
        await user.type(screen.getByLabelText('Password'), TestHelpers.getValidTestPassword());
        await user.type(screen.getByLabelText('Confirm Password'), TestHelpers.getValidTestPassword());
        
        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).toBeDisabled();
      }
    });

    test('should accept various valid email formats', async () => {
      renderSignupForm();
      
      const validEmails = TestHelpers.getValidEmails();
      
      for (const email of validEmails) {
        const emailInput = screen.getByLabelText('Email');
        await user.clear(emailInput);
        await user.type(emailInput, email);
        
        await user.type(screen.getByLabelText('Password'), TestHelpers.getValidTestPassword());
        await user.type(screen.getByLabelText('Confirm Password'), TestHelpers.getValidTestPassword());
        
        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).not.toBeDisabled();
        
        // Clear for next iteration
        await user.clear(screen.getByLabelText('Password'));
        await user.clear(screen.getByLabelText('Confirm Password'));
      }
    });
  });

  describe('Password Security Edge Cases', () => {
    test('should reject weak passwords', async () => {
      renderSignupForm();
      
      const weakPasswords = TestHelpers.getWeakPasswords();
      
      for (const password of weakPasswords) {
        await user.type(screen.getByLabelText('Email'), 'test@example.com');
        
        const passwordInput = screen.getByLabelText('Password');
        await user.clear(passwordInput);
        await user.type(passwordInput, password);
        
        await user.type(screen.getByLabelText('Confirm Password'), password);
        
        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).toBeDisabled();
        
        // Clear fields for next iteration
        await user.clear(screen.getByLabelText('Email'));
        await user.clear(screen.getByLabelText('Confirm Password'));
      }
    });

    test('should handle password mismatch scenarios', async () => {
      renderSignupForm();
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), TestHelpers.getValidTestPassword());
      await user.type(screen.getByLabelText('Confirm Password'), 'DifferentPassword123!');
      
      // Should show mismatch error
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Input Boundary Testing', () => {
    test('should handle extremely long inputs', async () => {
      renderSignupForm();
      
      const longString = 'a'.repeat(1000);
      
      await user.type(screen.getByLabelText('First Name'), longString);
      await user.type(screen.getByLabelText('Last Name'), longString);
      await user.type(screen.getByLabelText('Email'), `${longString}@example.com`);
      
      // Form should handle long inputs gracefully
      expect(screen.getByLabelText('First Name')).toHaveValue(longString);
      expect(screen.getByLabelText('Last Name')).toHaveValue(longString);
    });

    test('should handle special characters in names', async () => {
      renderSignupForm();
      
      const specialNames = [
        "O'Connor",
        "José",
        "Anne-Marie",
        "李小明",
        "Müller",
        "van der Berg"
      ];
      
      for (const name of specialNames) {
        const firstNameInput = screen.getByLabelText('First Name');
        await user.clear(firstNameInput);
        await user.type(firstNameInput, name);
        
        expect(firstNameInput).toHaveValue(name);
      }
    });
  });

  describe('Form State Edge Cases', () => {
    test('should handle rapid form field changes', async () => {
      renderSignupForm();
      
      // Rapidly change email field
      for (let i = 0; i < 5; i++) {
        const emailInput = screen.getByLabelText('Email');
        await user.clear(emailInput);
        await user.type(emailInput, `test${i}@example.com`);
      }
      
      // Form should maintain consistent state
      expect(screen.getByLabelText('Email')).toHaveValue('test4@example.com');
    });

    test('should handle form submission with network delays', async () => {
      renderSignupForm();
      
      // Mock a delayed signup response
      mockSignUp.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
      );
      
      await TestHelpers.fillSignupForm(user, {
        email: 'test@example.com',
        password: TestHelpers.getValidTestPassword(),
        confirmPassword: TestHelpers.getValidTestPassword(),
        firstName: 'Test',
        lastName: 'User'
      });
      
      await TestHelpers.submitForm(user);
      
      // Should show loading state
      expect(screen.getByText('Creating account...')).toBeInTheDocument();
      
      // Button should be disabled during submission
      const submitButton = screen.getByRole('button', { name: /creating account/i });
      expect(submitButton).toBeDisabled();
      
      // Wait for completion
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'test@example.com',
          TestHelpers.getValidTestPassword(),
          'Test',
          'User'
        );
      }, { timeout: 2000 });
    });
  });

  describe('Accessibility Edge Cases', () => {
    test('should maintain focus management during validation', async () => {
      renderSignupForm();
      
      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'invalid-email');
      
      // Move to next field
      await user.tab();
      
      // Email input should maintain proper accessibility attributes
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    test('should provide proper ARIA labels for password strength', async () => {
      renderSignupForm();
      
      await user.type(screen.getByLabelText('Password'), 'weak');
      
      // Password strength indicator should be accessible
      const strengthIndicator = screen.getByTestId('password-strength-indicator');
      expect(strengthIndicator).toBeInTheDocument();
    });
  });
});
