
import React from 'react';
import { render, screen } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { MetricsGrid } from '../MetricsGrid';

const mockMetrics = {
  activeUsers: 100,
  resourceUsage: { cpu: 50, memory: 70 },
  performance: { responseTime: 200 },
  quotaStatus: { users: { current: 80, limit: 100 } }
};

describe('MetricsGrid Component', () => {
  test('renders without crashing', () => {
    render(<MetricsGrid metrics={mockMetrics} />);
    expect(screen.getByText('Metrics')).toBeInTheDocument();
  });
});
