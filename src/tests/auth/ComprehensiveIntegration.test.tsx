import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionBoundary } from '@/components/rbac/PermissionBoundary';

describe('Comprehensive Integration Tests', () => {
  test('SuperAdmin should access content within PermissionBoundary', async () => {
    const mockUser = {
      id: 'superadmin-user-id',
      email: 'superadmin@example.com',
    };

    const mockIsSuperAdmin = true;

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

  test('Regular user should not access content without permission', async () => {
    const mockUser = {
      id: 'regular-user-id',
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
    });
  });
});
