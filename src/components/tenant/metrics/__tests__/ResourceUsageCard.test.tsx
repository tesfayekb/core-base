import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResourceUsageCard } from '../ResourceUsageCard';

describe('ResourceUsageCard Component', () => {
  test('renders the component with provided data', () => {
    const mockData = {
      title: 'Memory Usage',
      used: 75,
      available: 100,
      unit: 'GB',
    };

    render(
      <ResourceUsageCard
        title={mockData.title}
        used={mockData.used}
        available={mockData.available}
        unit={mockData.unit}
      />
    );

    expect(screen.getByText(mockData.title)).toBeInTheDocument();
    expect(screen.getByText(`${mockData.used} / ${mockData.available} ${mockData.unit}`)).toBeInTheDocument();
  });

  test('displays "N/A" when used or available is not a number', () => {
    render(
      <ResourceUsageCard
        title="CPU Usage"
        used={NaN}
        available={null}
        unit="%"
      />
    );

    expect(screen.getByText('N/A / N/A %')).toBeInTheDocument();
  });

  test('displays a progress bar', () => {
    const mockData = {
      title: 'Disk Usage',
      used: 60,
      available: 100,
      unit: 'GB',
    };

    render(
      <ResourceUsageCard
        title={mockData.title}
        used={mockData.used}
        available={mockData.available}
        unit={mockData.unit}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });
});
