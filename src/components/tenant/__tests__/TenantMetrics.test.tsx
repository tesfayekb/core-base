
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TenantMetrics } from '../TenantMetrics';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { createMockAuthContext } from './shared/MockAuthContext';

const mockAuthContext = createMockAuthContext();

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('TenantMetrics', () => {
  it('renders metrics grid', async () => {
    renderWithContext(<TenantMetrics />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Quota Usage')).toBeInTheDocument();
      expect(screen.getByText('Avg Response')).toBeInTheDocument();
      expect(screen.getByText('Uptime')).toBeInTheDocument();
    });
  });

  it('displays resource usage breakdown', async () => {
    renderWithContext(<TenantMetrics />);
    
    await waitFor(() => {
      expect(screen.getByText('Resource Usage Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('API Calls')).toBeInTheDocument();
      expect(screen.getByText('Bandwidth')).toBeInTheDocument();
    });
  });

  it('shows recent activity', async () => {
    renderWithContext(<TenantMetrics />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('User login')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    renderWithContext(<TenantMetrics />);
    expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
  });
});
