
import React from 'react';
import { render, screen } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { TenantContextIndicator } from '../TenantContextIndicator';
import { AuthProvider } from '@/contexts/AuthContext';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    tenantId: 'test-tenant-id',
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('TenantContextIndicator Component', () => {
  test('renders TenantContextIndicator without errors', () => {
    render(
      <AuthProvider>
        <TenantContextIndicator />
      </AuthProvider>
    );
    expect(screen.getByText('Tenant Active')).toBeInTheDocument();
  });
});
