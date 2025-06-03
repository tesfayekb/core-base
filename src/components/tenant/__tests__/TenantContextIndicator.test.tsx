import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TenantContextIndicator } from '../TenantContextIndicator';
import { TenantContext } from '@/contexts/TenantContext';

describe('TenantContextIndicator', () => {
  test('renders tenant name when tenant is selected', () => {
    const mockTenant = {
      id: 'tenant-123',
      name: 'Test Tenant',
      slug: 'test-tenant',
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    render(
      <TenantContext.Provider value={{ 
        currentTenant: mockTenant, 
        setCurrentTenant: jest.fn(),
        tenants: [mockTenant],
        isLoading: false,
        error: null,
        refreshTenants: jest.fn()
      }}>
        <TenantContextIndicator />
      </TenantContext.Provider>
    );

    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
  });

  test('renders placeholder when no tenant is selected', () => {
    render(
      <TenantContext.Provider value={{ 
        currentTenant: null, 
        setCurrentTenant: jest.fn(),
        tenants: [],
        isLoading: false,
        error: null,
        refreshTenants: jest.fn()
      }}>
        <TenantContextIndicator />
      </TenantContext.Provider>
    );

    expect(screen.getByText('No tenant selected')).toBeInTheDocument();
  });

  test('renders loading state', () => {
    render(
      <TenantContext.Provider value={{ 
        currentTenant: null, 
        setCurrentTenant: jest.fn(),
        tenants: [],
        isLoading: true,
        error: null,
        refreshTenants: jest.fn()
      }}>
        <TenantContextIndicator />
      </TenantContext.Provider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders error state', () => {
    render(
      <TenantContext.Provider value={{ 
        currentTenant: null, 
        setCurrentTenant: jest.fn(),
        tenants: [],
        isLoading: false,
        error: new Error('Failed to load tenants'),
        refreshTenants: jest.fn()
      }}>
        <TenantContextIndicator />
      </TenantContext.Provider>
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
