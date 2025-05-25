
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
}
