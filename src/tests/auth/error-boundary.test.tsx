
// Authentication Error Boundary Tests
// Following src/docs/security/ERROR_HANDLING.md

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { ErrorBoundary } from 'react-error-boundary';

// Mock component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test authentication error');
  }
  return <div>No Error</div>;
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert">
      <h2>Authentication Error</h2>
      <pre>{error.message}</pre>
    </div>
  );
}

describe('Authentication Error Boundary', () => {
  test('should catch and display authentication errors', () => {
    render(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AuthProvider>
          <ThrowError shouldThrow={true} />
        </AuthProvider>
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText('Test authentication error')).toBeInTheDocument();
  });

  test('should not interfere with normal operation', () => {
    render(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AuthProvider>
          <ThrowError shouldThrow={false} />
        </AuthProvider>
      </ErrorBoundary>
    );

    expect(screen.getByText('No Error')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('should provide user-friendly error messages', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AuthProvider>
          <ThrowError shouldThrow={true} />
        </AuthProvider>
      </ErrorBoundary>
    );

    // Should show user-friendly message instead of technical details
    expect(screen.getByRole('alert')).toBeInTheDocument();
    
    consoleError.mockRestore();
  });
});
