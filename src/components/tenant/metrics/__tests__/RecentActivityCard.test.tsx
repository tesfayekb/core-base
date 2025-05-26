
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecentActivityCard } from '../RecentActivityCard';

const mockRecentActivity = [
  { action: 'User login', timestamp: '2024-01-15T10:30:00Z', user: 'john.doe@acme.com' },
  { action: 'File uploaded', timestamp: '2024-01-15T10:25:00Z', user: 'jane.smith@acme.com' },
  { action: 'Report generated', timestamp: '2024-01-15T10:20:00Z', user: 'admin@acme.com' }
];

describe('RecentActivityCard', () => {
  it('renders recent activity header', () => {
    render(<RecentActivityCard recentActivity={mockRecentActivity} />);
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('displays all activity items', () => {
    render(<RecentActivityCard recentActivity={mockRecentActivity} />);
    
    expect(screen.getByText('User login')).toBeInTheDocument();
    expect(screen.getByText('File uploaded')).toBeInTheDocument();
    expect(screen.getByText('Report generated')).toBeInTheDocument();
  });

  it('shows user information for each activity', () => {
    render(<RecentActivityCard recentActivity={mockRecentActivity} />);
    
    expect(screen.getByText('john.doe@acme.com')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@acme.com')).toBeInTheDocument();
    expect(screen.getByText('admin@acme.com')).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    render(<RecentActivityCard recentActivity={mockRecentActivity} />);
    
    // Check that timestamps are formatted as time strings
    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('handles empty activity list', () => {
    render(<RecentActivityCard recentActivity={[]} />);
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    // Should still render the card structure even with no activities
  });
});
