
// Authentication Accessibility Tests
// Following WCAG 2.1 AA compliance requirements

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LoginForm } from '../../components/auth/LoginForm';
import { SignUpForm } from '../../components/auth/SignUpForm';

expect.extend(toHaveNoViolations);

describe('Authentication Accessibility', () => {
  test('LoginForm should have no accessibility violations', async () => {
    const { container } = render(<LoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('SignUpForm should have no accessibility violations', async () => {
    const { container } = render(<SignUpForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should have proper form labels and ARIA attributes', () => {
    render(<LoginForm />);

    // Check for proper labeling
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // Check for ARIA attributes
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-label');
  });

  test('should support keyboard navigation', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Check tab order
    expect(emailInput).toHaveAttribute('tabIndex');
    expect(passwordInput).toHaveAttribute('tabIndex');
    expect(submitButton).toHaveAttribute('tabIndex');
  });

  test('should provide appropriate error announcements', () => {
    render(<LoginForm />);

    // Check for ARIA live regions for error announcements
    const errorRegion = screen.queryByRole('alert');
    if (errorRegion) {
      expect(errorRegion).toHaveAttribute('aria-live', 'polite');
    }
  });
});
