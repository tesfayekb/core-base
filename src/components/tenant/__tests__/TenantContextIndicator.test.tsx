
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TenantContextIndicator } from '../TenantContextIndicator';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

const mockAuthContextWithTenant = {
  user: { id: 'user-1', email: 'test@example.com' },
  tenantId: 'tenant-1',
  login: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  loading: false
};

const mockAuthContextWithoutTenant = {
  user: { id: 'user-1', email: 'test@example.com' },
  tenantId: null,
  login: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  loading: false
};

const renderWithContext = (component: React.ReactElement, authContext: any) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('TenantContextIndicator', () => {
  it('renders tenant active badge when user has tenant context', () => {
    renderWithContext(<TenantContextIndicator />, mockAuthContextWithTenant);
    
    expect(screen.getByText('Tenant Active')).toBeInTheDocument();
  });

  it('renders no tenant context badge when user lacks tenant context', () => {
    renderWithContext(<TenantContextIndicator />, mockAuthContextWithoutTenant);
    
    expect(screen.getByText('No Tenant Context')).toBeInTheDocument();
  });

  it('shows detailed information when showDetails is true', () => {
    renderWithContext(<TenantContextIndicator showDetails />, mockAuthContextWithTenant);
    
    expect(screen.getByText('Current Tenant')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('does not show detailed information when showDetails is false', () => {
    renderWithContext(<TenantContextIndicator showDetails={false} />, mockAuthContextWithTenant);
    
    expect(screen.getByText('Tenant Active')).toBeInTheDocument();
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = renderWithContext(
      <TenantContextIndicator className="custom-class" />, 
      mockAuthContextWithTenant
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
