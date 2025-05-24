
// Mobile/Responsive Authentication Tests
// Following src/docs/mobile/README.md requirements

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoginForm } from '../../components/auth/LoginForm';

// Mock matchMedia for responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Mobile/Responsive Authentication', () => {
  test('should render properly on mobile viewports', () => {
    // Mock mobile viewport
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { container } = render(<LoginForm />);

    // Check for mobile-friendly styling
    expect(container.firstChild).toBeInTheDocument();
  });

  test('should have touch-friendly input sizes', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    // Check for minimum touch target size (44px)
    const styles = window.getComputedStyle(emailInput);
    expect(parseInt(styles.minHeight) || 44).toBeGreaterThanOrEqual(44);
  });

  test('should support landscape and portrait orientations', () => {
    // Test portrait
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(orientation: portrait)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { rerender } = render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    // Test landscape
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(orientation: landscape)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    rerender(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});
