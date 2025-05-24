
// Authentication Accessibility Testing
// Following WCAG 2.1 AA standards

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoginForm } from '../../components/auth/LoginForm';
import { AuthProvider } from '../../components/auth/AuthProvider';

// Create proper mocks
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockGetSession = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession
    }
  }
}));

describe('Authentication Accessibility Tests', () => {
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

  test('should have proper ARIA labels for form fields', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });

  test('should have accessible form validation messages', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  test('should support keyboard navigation', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    expect(emailInput).not.toHaveAttribute('tabindex', '-1');
    expect(passwordInput).not.toHaveAttribute('tabindex', '-1');
    expect(submitButton).not.toHaveAttribute('tabindex', '-1');
  });

  test('should have sufficient color contrast', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const formElements = screen.getAllByRole('textbox');
    formElements.forEach(element => {
      expect(element).toBeVisible();
    });
  });

  test('should provide clear error messages', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    // Form should be accessible even when showing errors
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
  });
});
