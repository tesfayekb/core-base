import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecentActivityCard } from '../RecentActivityCard';

describe('RecentActivityCard', () => {
  test('renders RecentActivityCard component', () => {
    render(<RecentActivityCard />);
    
    const cardTitle = screen.getByText(/Recent Activity/i);
    expect(cardTitle).toBeInTheDocument();
  });
});

