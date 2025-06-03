import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuotaAlert } from '../QuotaAlert';

describe('QuotaAlert Component', () => {
  it('renders without errors', () => {
    render(<QuotaAlert current={50} max={100} title="Test Quota" />);
    expect(screen.getByText('Test Quota')).toBeInTheDocument();
  });

  it('displays the correct usage percentage', () => {
    render(<QuotaAlert current={50} max={100} title="Test Quota" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows an alert when usage exceeds 80%', () => {
    render(<QuotaAlert current={90} max={100} title="Test Quota" />);
    expect(screen.getByText('Approaching Quota Limit')).toBeInTheDocument();
  });

  it('does not show an alert when usage is below 80%', () => {
    render(<QuotaAlert current={70} max={100} title="Test Quota" />);
    expect(screen.queryByText('Approaching Quota Limit')).not.toBeInTheDocument();
  });
});

