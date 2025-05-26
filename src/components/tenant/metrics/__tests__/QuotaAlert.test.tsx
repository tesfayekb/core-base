
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuotaAlert } from '../QuotaAlert';

describe('QuotaAlert', () => {
  it('does not render alert when quota is below 80%', () => {
    const { container } = render(<QuotaAlert quotaPercentage={75} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders warning alert when quota is above 80%', () => {
    render(<QuotaAlert quotaPercentage={85} />);
    
    expect(screen.getByText('Quota Warning')).toBeInTheDocument();
    expect(screen.getByText(/You've used 85\.0% of your quota/)).toBeInTheDocument();
  });

  it('displays correct percentage in warning message', () => {
    render(<QuotaAlert quotaPercentage={92.5} />);
    
    expect(screen.getByText(/You've used 92\.5% of your quota/)).toBeInTheDocument();
  });

  it('shows upgrade suggestion in warning message', () => {
    render(<QuotaAlert quotaPercentage={90} />);
    
    expect(screen.getByText(/Consider upgrading or optimizing usage/)).toBeInTheDocument();
  });

  it('renders with warning styles', () => {
    render(<QuotaAlert quotaPercentage={85} />);
    
    const alertCard = screen.getByText('Quota Warning').closest('.border-yellow-200');
    expect(alertCard).toBeInTheDocument();
    expect(alertCard).toHaveClass('bg-yellow-50');
  });

  it('renders alert icon', () => {
    render(<QuotaAlert quotaPercentage={85} />);
    
    const alertIcon = screen.getByText('Quota Warning').parentElement?.querySelector('svg');
    expect(alertIcon).toBeInTheDocument();
  });
});
