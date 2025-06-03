import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionBoundary } from '@/components/rbac/PermissionBoundary';

describe('Advanced Permission Boundary Edge Cases', () => {
  test('renders children when user is SuperAdmin', async () => {
    const mockUser = {
      id: 'superadmin-user',
      email: 'superadmin@example.com',
    };

    const { container } = render(
      <AuthProvider mockUser={mockUser}>
        <PermissionBoundary action="read" resource="users">
          <div>Content for SuperAdmin</div>
        </PermissionBoundary>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(container).toHaveTextContent('Content for SuperAdmin');
    });
  });

  test('renders fallback when user is not SuperAdmin and lacks permission', async () => {
    const mockUser = {
      id: 'regular-user',
      email: 'regular@example.com',
    };

    const { container } = render(
      <AuthProvider mockUser={mockUser}>
        <PermissionBoundary action="read" resource="users" fallback={<div>Access Denied</div>}>
          <div>Content for Regular User</div>
        </PermissionBoundary>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(container).toHaveTextContent('Access Denied');
      expect(container).not.toHaveTextContent('Content for Regular User');
    });
  });

  test('renders children when user is not SuperAdmin but has permission', async () => {
    const mockUser = {
      id: 'authorized-user',
      email: 'authorized@example.com',
    };

    // Mock the usePermission hook to return true for hasPermission
    jest.mock('@/hooks/usePermission', () => ({
      usePermission: () => ({
        hasPermission: true,
        loading: false,
      }),
    }));

    const { container } = render(
      <AuthProvider mockUser={mockUser}>
        <PermissionBoundary action="read" resource="users">
          <div>Content for Authorized User</div>
        </PermissionBoundary>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(container).toHaveTextContent('Content for Authorized User');
    });

    // Restore the original usePermission implementation
    jest.unmock('@/hooks/usePermission');
  });

  test('renders loading state when permission check is in progress', () => {
    const mockUser = {
      id: 'loading-user',
      email: 'loading@example.com',
    };

    // Mock the usePermission hook to return true for hasPermission
    jest.mock('@/hooks/usePermission', () => ({
      usePermission: () => ({
        hasPermission: false,
        loading: true,
      }),
    }));

    const { container } = render(
      <AuthProvider mockUser={mockUser}>
        <PermissionBoundary action="read" resource="users">
          <div>Content</div>
        </PermissionBoundary>
      </AuthProvider>
    );

    expect(container).toHaveTextContent('Checking permissions...');

    // Restore the original usePermission implementation
    jest.unmock('@/hooks/usePermission');
  });
});
