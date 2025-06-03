
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { TenantAdministration } from '../TenantAdministration';

describe('TenantAdministration Component', () => {
  test('renders TenantAdministration without errors', () => {
    render(<TenantAdministration />);
    expect(screen.getByText('Tenant Administration')).toBeInTheDocument();
  });
});
