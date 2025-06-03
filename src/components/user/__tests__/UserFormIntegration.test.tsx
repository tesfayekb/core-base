import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserForm } from '../UserForm';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserManagementService } from '@/services/user/UserManagementService';

// Mock the UserManagementService
jest.mock('@/services/user/UserManagementService');

const mockUserManagementService = UserManagementService as jest.Mocked<typeof UserManagementService>;

describe('UserForm Integration Tests', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockUserManagementService.createUser.mockClear();
    mockUserManagementService.updateUser.mockClear();
  });

  test('creates a new user successfully', async () => {
    // Arrange
    const mockCreateUser = jest.fn().mockResolvedValue({ id: 'new-user-id', email: 'test@example.com' });
    mockUserManagementService.createUser.mockImplementation(mockCreateUser);

    const onSuccess = jest.fn();
    const tenantId = 'test-tenant-id';

    render(
      <AuthProvider>
        <UserForm tenantId={tenantId} onSuccess={onSuccess} />
      </AuthProvider>
    );

    // Act
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Create User/i }));

    // Wait for the create user call to resolve
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
    });

    // Assert
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      status: 'active',
      tenant_id: tenantId,
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  test('updates an existing user successfully', async () => {
    // Arrange
    const mockUpdateUser = jest.fn().mockResolvedValue({ id: 'existing-user-id', email: 'updated@example.com' });
    mockUserManagementService.updateUser.mockImplementation(mockUpdateUser);

    const onSuccess = jest.fn();
    const tenantId = 'test-tenant-id';
    const user = {
      id: 'existing-user-id',
      email: 'old@example.com',
      first_name: 'Old',
      last_name: 'User',
      status: 'active',
      tenant_id: tenantId,
      user_roles: []
    };

    render(
      <AuthProvider>
        <UserForm user={user} tenantId={tenantId} onSuccess={onSuccess} />
      </AuthProvider>
    );

    // Act
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Updated' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'updated@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Update User/i }));

    // Wait for the update user call to resolve
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
    });

    // Assert
    expect(mockUpdateUser).toHaveBeenCalledWith(user.id, {
      email: 'updated@example.com',
      first_name: 'Updated',
      last_name: 'User',
      status: 'active',
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  test('displays an error message when create user fails', async () => {
    // Arrange
    const mockCreateUser = jest.fn().mockRejectedValue(new Error('Create user failed'));
    mockUserManagementService.createUser.mockImplementation(mockCreateUser);

    const tenantId = 'test-tenant-id';

    render(
      <AuthProvider>
        <UserForm tenantId={tenantId} />
      </AuthProvider>
    );

    // Act
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Create User/i }));

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Failed to save user/i)).toBeInTheDocument();
    });

    // Assert
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
  });

  test('displays an error message when update user fails', async () => {
    // Arrange
    const mockUpdateUser = jest.fn().mockRejectedValue(new Error('Update user failed'));
    mockUserManagementService.updateUser.mockImplementation(mockUpdateUser);

    const tenantId = 'test-tenant-id';
    const user = {
      id: 'existing-user-id',
      email: 'old@example.com',
      first_name: 'Old',
      last_name: 'User',
      status: 'active',
      tenant_id: tenantId,
      user_roles: []
    };

    render(
      <AuthProvider>
        <UserForm user={user} tenantId={tenantId} />
      </AuthProvider>
    );

    // Act
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Updated' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'updated@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Update User/i }));

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Failed to save user/i)).toBeInTheDocument();
    });

    // Assert
    expect(mockUpdateUser).toHaveBeenCalledTimes(1);
  });
});
