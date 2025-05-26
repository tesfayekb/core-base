
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResourceUsageCard } from '../ResourceUsageCard';

const mockResourceUsage = {
  storage: 65,
  api: 78,
  bandwidth: 45
};

describe('ResourceUsageCard', () => {
  it('renders resource usage breakdown', () => {
    render(<ResourceUsageCard resourceUsage={mockResourceUsage} />);
    
    expect(screen.getByText('Resource Usage Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('API Calls')).toBeInTheDocument();
    expect(screen.getByText('Bandwidth')).toBeInTheDocument();
  });

  it('displays correct usage percentages', () => {
    render(<ResourceUsageCard resourceUsage={mockResourceUsage} />);
    
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('shows warning badge for high usage', () => {
    const highUsage = { storage: 95, api: 85, bandwidth: 45 };
    render(<ResourceUsageCard resourceUsage={highUsage} />);
    
    // Storage should be red (>=90%)
    expect(screen.getByText('95%')).toHaveClass('text-red-600');
    // API should be yellow (>=75% but <90%)
    expect(screen.getByText('85%')).toHaveClass('text-yellow-600');
    // Bandwidth should be green (<75%)
    expect(screen.getByText('45%')).toHaveClass('text-green-600');
  });

  it('renders progress bars with correct values', () => {
    render(<ResourceUsageCard resourceUsage={mockResourceUsage} />);
    
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(3);
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '65');
    expect(progressBars[1]).toHaveAttribute('aria-valuenow', '78');
    expect(progressBars[2]).toHaveAttribute('aria-valuenow', '45');
  });
});
