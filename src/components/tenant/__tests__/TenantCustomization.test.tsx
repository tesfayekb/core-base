
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantCustomization } from '../TenantCustomization';
import { AuthContext } from '@/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { createMockAuthContext } from './shared/MockAuthContext';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock the tenant customization service
jest.mock('@/services/tenant/TenantCustomizationService', () => ({
  tenantCustomizationService: {
    getCustomizations: jest.fn().mockResolvedValue([
      {
        id: '1',
        customization_type: 'branding',
        customization_key: 'primaryColor',
        customization_value: '#3b82f6'
      }
    ]),
    getBrandingConfiguration: jest.fn().mockResolvedValue({
      logo: '',
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b',
      companyName: 'Test Company'
    }),
    setBrandingConfiguration: jest.fn().mockResolvedValue({})
  }
}));

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

describe('TenantCustomization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders customization interface', async () => {
    renderWithContext(<TenantCustomization />);
    
    expect(screen.getByText('Tenant Customization')).toBeInTheDocument();
    expect(screen.getByText('Customize your tenant\'s appearance and behavior')).toBeInTheDocument();
  });

  it('displays branding configuration form', async () => {
    renderWithContext(<TenantCustomization />);
    
    await waitFor(() => {
      expect(screen.getByText('Branding')).toBeInTheDocument();
      expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Primary Color')).toBeInTheDocument();
    });
  });

  it('allows updating branding settings', async () => {
    const user = userEvent.setup();
    renderWithContext(<TenantCustomization />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
    });

    const companyNameInput = screen.getByLabelText('Company Name');
    await user.clear(companyNameInput);
    await user.type(companyNameInput, 'Updated Company');

    const saveButton = screen.getByRole('button', { name: /save branding/i });
    await user.click(saveButton);

    const { tenantCustomizationService } = require('@/services/tenant/TenantCustomizationService');
    expect(tenantCustomizationService.setBrandingConfiguration).toHaveBeenCalled();
  });

  it('displays existing customizations', async () => {
    renderWithContext(<TenantCustomization />);
    
    await waitFor(() => {
      expect(screen.getByText('All Customizations')).toBeInTheDocument();
      expect(screen.getByText('Branding')).toBeInTheDocument();
    });
  });

  it('handles color picker changes', async () => {
    const user = userEvent.setup();
    renderWithContext(<TenantCustomization />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Primary Color')).toBeInTheDocument();
    });

    const colorInput = screen.getByDisplayValue('#3b82f6');
    await user.clear(colorInput);
    await user.type(colorInput, '#ff0000');

    expect(colorInput).toHaveValue('#ff0000');
  });
});
