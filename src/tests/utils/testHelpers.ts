
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export class TestHelpers {
  static async waitForErrorMessage(message: string, timeout = 5000) {
    return waitFor(() => {
      const element = screen.getByText(message);
      expect(element).toBeInTheDocument();
      return element;
    }, { timeout });
  }

  static async waitForSuccessMessage(message: string, timeout = 5000) {
    return waitFor(() => {
      const element = screen.getByText(message);
      expect(element).toBeInTheDocument();
      return element;
    }, { timeout });
  }

  static async fillSignupForm(user: ReturnType<typeof userEvent.setup>, formData: {
    email: string;
    password: string;
    confirmPassword: string;
    firstName?: string;
    lastName?: string;
  }) {
    if (formData.firstName) {
      await user.type(screen.getByLabelText('First Name'), formData.firstName);
    }
    if (formData.lastName) {
      await user.type(screen.getByLabelText('Last Name'), formData.lastName);
    }
    await user.type(screen.getByLabelText('Email'), formData.email);
    await user.type(screen.getByLabelText('Password'), formData.password);
    await user.type(screen.getByLabelText('Confirm Password'), formData.confirmPassword);
  }

  static async submitForm(user: ReturnType<typeof userEvent.setup>) {
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
  }

  static getPasswordErrorMessages() {
    return {
      mismatch: 'Passwords do not match',
      requirements: 'Password does not meet security requirements',
      tooShort: 'Password must be at least 8 characters',
      tooWeak: 'Password is too weak'
    };
  }

  static getValidTestPassword() {
    return 'SecurePass123!';
  }

  static getWeakPasswords() {
    return [
      '123',
      'password',
      'abc123',
      'Password',
      '12345678',
      'UPPERCASE',
      'lowercase',
      'NoSpecial123'
    ];
  }

  static getValidEmails() {
    return [
      'test@example.com',
      'user.name@domain.co.uk',
      'test+tag@example.org',
      'user123@test-domain.com'
    ];
  }

  static getInvalidEmails() {
    return [
      'invalid-email',
      '@example.com',
      'test@',
      'test..test@example.com',
      'test@example',
      'test@.com',
      ''
    ];
  }

  // Fixed helper method for loading state detection
  static async waitForLoadingState(timeout = 5000) {
    return waitFor(() => {
      // Try multiple ways to find loading indicators
      const loadingByText = screen.queryByText(/creating account/i) || 
                           screen.queryByText(/loading/i);
      const loadingByTestId = screen.queryByTestId('loading');
      
      return loadingByText || loadingByTestId;
    }, { timeout });
  }

  static async waitForButtonState(buttonText: string, disabled: boolean, timeout = 5000) {
    return waitFor(() => {
      const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
      if (disabled) {
        expect(button).toBeDisabled();
      } else {
        expect(button).not.toBeDisabled();
      }
      return button;
    }, { timeout });
  }

  static generateSecurePassword() {
    return 'TestSecure123!';
  }

  static generateTestEmail() {
    return `test${Date.now()}@example.com`;
  }

  static getXSSAttempts() {
    return [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '"><script>alert("xss")</script>',
      '\'; DROP TABLE users; --'
    ];
  }

  static getSQLInjectionAttempts() {
    return [
      '\' OR 1=1 --',
      '\'; DROP TABLE users; --',
      '\' UNION SELECT * FROM users --',
      'admin\'--',
      '\' OR \'1\'=\'1'
    ];
  }

  static getBoundaryTestCases() {
    return {
      maxLengthString: 'a'.repeat(1000),
      emptyString: '',
      specialCharacters: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      unicodeCharacters: '你好世界',
      emojiCharacters: '😀😃😄😁'
    };
  }

  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;
    return { result, duration };
  }
}

// Performance targets for testing
export const performanceTargets = {
  authentication: 1000, // 1 second
  formValidation: 100,  // 100ms
  uiResponse: 50        // 50ms
};

// Test data factories
export const testDataFactory = {
  createValidUser: () => ({
    email: TestHelpers.generateTestEmail(),
    password: TestHelpers.generateSecurePassword(),
    firstName: 'Test',
    lastName: 'User'
  }),
  
  createInvalidUser: () => ({
    email: 'invalid-email',
    password: 'weak',
    firstName: '',
    lastName: ''
  })
};
