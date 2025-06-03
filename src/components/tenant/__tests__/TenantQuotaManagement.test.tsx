
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { TenantQuotaManagement } from '../TenantQuotaManagement';

describe('TenantQuotaManagement Component', () => {
  test('renders TenantQuotaManagement without errors', () => {
    render(<TenantQuotaManagement />);
    expect(screen.getByText('Tenant Quota Management')).toBeInTheDocument();
  });
});
