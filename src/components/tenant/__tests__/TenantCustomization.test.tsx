
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { TenantCustomization } from '../TenantCustomization';

describe('TenantCustomization Component', () => {
  test('renders TenantCustomization without errors', () => {
    render(<TenantCustomization />);
    expect(screen.getByText('Tenant Customization')).toBeInTheDocument();
  });
});
