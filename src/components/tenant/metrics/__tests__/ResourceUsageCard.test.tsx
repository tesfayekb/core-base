
import React from 'react';
import { render, screen } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { ResourceUsageCard } from '../ResourceUsageCard';

describe('ResourceUsageCard Component', () => {
  test('renders ResourceUsageCard component', () => {
    render(<ResourceUsageCard resourceType="storage" usage={75} limit={100} />);
    expect(screen.getByText('Resource Usage')).toBeInTheDocument();
  });
});
