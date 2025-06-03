import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TenantMetrics } from '../TenantMetrics';
import { AuthProvider } from '@/contexts/AuthContext';

describe('TenantMetrics Component', () => {
  test('renders TenantMetrics component', () => {
    render(
      <AuthProvider>
        <TenantMetrics />
      </AuthProvider>
    );

    expect(screen.getByText('Tenant Metrics')).toBeInTheDocument();
  });
});

