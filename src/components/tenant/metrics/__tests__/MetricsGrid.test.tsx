
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricsGrid } from '../MetricsGrid';

const mockMetrics = {
  activeUsers: { current: 142, change: 8 },
  resourceUsage: { storage: 65, api: 78, bandwidth: 45 },
  performance: { avgResponseTime: 245, uptime: 99.8 },
  quotaStatus: { used: 1250, total: 2000, percentage: 62.5 }
};

describe('MetricsGrid', () => {
  it('renders all metric cards', () => {
    render(<MetricsGrid metrics={mockMetrics} />);
    
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('Quota Usage')).toBeInTheDocument();
    expect(screen.getByText('62.5%')).toBeInTheDocument();
    expect(screen.getByText('Avg Response')).toBeInTheDocument();
    expect(screen.getByText('245ms')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('99.8%')).toBeInTheDocument();
  });

  it('displays user change trend correctly', () => {
    render(<MetricsGrid metrics={mockMetrics} />);
    
    expect(screen.getByText('+8')).toBeInTheDocument();
  });

  it('shows negative trend for declining users', () => {
    const metricsWithDecline = {
      ...mockMetrics,
      activeUsers: { current: 142, change: -5 }
    };
    
    render(<MetricsGrid metrics={metricsWithDecline} />);
    
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('displays quota progress bar', () => {
    render(<MetricsGrid metrics={mockMetrics} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '62.5');
  });
});
