
import React from 'react';
import { render, screen } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { QuotaAlert } from '../QuotaAlert';

describe('QuotaAlert Component', () => {
  test('renders without errors', () => {
    render(<QuotaAlert usage={50} limit={100} resourceType="users" />);
    expect(screen.getByText('Quota Alert')).toBeInTheDocument();
  });
});
