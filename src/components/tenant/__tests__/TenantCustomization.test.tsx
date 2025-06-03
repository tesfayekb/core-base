import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TenantCustomization } from '../TenantCustomization';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('TenantCustomization Component', () => {
  test('renders TenantCustomization component', () => {
    renderWithContext(<TenantCustomization />);
    expect(screen.getByText('Tenant Customization')).toBeInTheDocument();
  });

  test('allows changing the theme', async () => {
    renderWithContext(<TenantCustomization />);
    const themeSelect = screen.getByLabelText('Theme');
    fireEvent.change(themeSelect, { target: { value: 'dark' } });
    await waitFor(() => {
      expect((themeSelect as HTMLSelectElement).value).toBe('dark');
    });
  });

  test('allows changing the logo', async () => {
    renderWithContext(<TenantCustomization />);
    const logoInput = screen.getByLabelText('Logo URL');
    fireEvent.change(logoInput, { target: { value: 'https://example.com/logo.png' } });
    await waitFor(() => {
      expect((logoInput as HTMLInputElement).value).toBe('https://example.com/logo.png');
    });
  });

  test('allows changing the primary color', async () => {
    renderWithContext(<TenantCustomization />);
    const primaryColorInput = screen.getByLabelText('Primary Color');
    fireEvent.change(primaryColorInput, { target: { value: '#0000FF' } });
    await waitFor(() => {
      expect((primaryColorInput as HTMLInputElement).value).toBe('#0000FF');
    });
  });

  test('displays a success message on successful save', async () => {
    renderWithContext(<TenantCustomization />);
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('displays an error message on failed save', async () => {
    const originalError = console.error;
    console.error = jest.fn();

    renderWithContext(<TenantCustomization />);
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText('Failed to save settings.')).toBeInTheDocument();
    }, { timeout: 5000 });

    console.error = originalError;
  });
});
