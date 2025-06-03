
import React from 'react';
import { render, screen } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { RecentActivityCard } from '../RecentActivityCard';

const mockActivity = [
  { id: '1', action: 'User logged in', timestamp: new Date(), user: 'John Doe' }
];

describe('RecentActivityCard', () => {
  test('renders RecentActivityCard component', () => {
    render(<RecentActivityCard recentActivity={mockActivity} />);
    const cardTitle = screen.getByText(/Recent Activity/i);
    expect(cardTitle).toBeInTheDocument();
  });
});
