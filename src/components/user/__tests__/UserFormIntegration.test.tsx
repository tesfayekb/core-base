
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { UserFormIntegration } from '../UserFormIntegration';

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  status: 'active',
  tenant_id: 'test-tenant-id',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  user_roles: []
};

describe('UserFormIntegration Component', () => {
  test('renders UserFormIntegration without errors', () => {
    render(<UserFormIntegration user={mockUser} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('User Form')).toBeInTheDocument();
  });
});
