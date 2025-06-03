import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricsGrid } from '../MetricsGrid';

describe('MetricsGrid Component', () => {
  test('renders without crashing', () => {
    render(<MetricsGrid />);
    expect(screen.getByText('No metrics available.')).toBeInTheDocument();
  });

  test('displays loading state', () => {
    render(<MetricsGrid isLoading={true} />);
    expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
  });

  test('displays error message', () => {
    render(<MetricsGrid error="Failed to load metrics" />);
    expect(screen.getByText('Error: Failed to load metrics')).toBeInTheDocument();
  });

  test('displays metrics data', () => {
    const metricsData = [
      { id: '1', name: 'Metric A', value: 100, unit: 'units' },
      { id: '2', name: 'Metric B', value: 200, unit: 'units' },
    ];
    render(<MetricsGrid metrics={metricsData} />);
    expect(screen.getByText('Metric A')).toBeInTheDocument();
    expect(screen.getByText('100 units')).toBeInTheDocument();
    expect(screen.getByText('Metric B')).toBeInTheDocument();
    expect(screen.getByText('200 units')).toBeInTheDocument();
  });
});

