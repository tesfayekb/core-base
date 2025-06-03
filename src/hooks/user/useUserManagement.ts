
import { useState, useEffect } from 'react';
import { UserManagementService, UserWithRoles, CreateUserRequest, UpdateUserRequest } from '@/services/user/UserManagementService';

export function useUserManagement(tenantId?: string) {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // For now, let's get all users to see if they show up
        const allUsers = await UserManagementService.getAllUsers();
        console.log('Fetched users:', allUsers);
        setUsers(allUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [tenantId]);

  const refetch = async () => {
    const allUsers = await UserManagementService.getAllUsers();
    setUsers(allUsers);
  };

  const createUser = async (userData: CreateUserRequest) => {
    try {
      const newUser = await UserManagementService.createUser(userData);
      await refetch();
      return { success: true, data: newUser };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create user';
      return { success: false, error };
    }
  };

  const updateUser = async (userId: string, userData: UpdateUserRequest) => {
    try {
      const updatedUser = await UserManagementService.updateUser(userId, userData);
      await refetch();
      return { success: true, data: updatedUser };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update user';
      return { success: false, error };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await UserManagementService.deleteUser(userId);
      await refetch();
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete user';
      return { success: false, error };
    }
  };

  const assignRoles = async (userId: string, roleIds: string[]) => {
    try {
      await UserManagementService.assignRoles(userId, roleIds);
      await refetch();
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to assign roles';
      return { success: false, error };
    }
  };

  return {
    users,
    isLoading,
    error,
    refetch,
    createUser,
    updateUser,
    deleteUser,
    assignRoles
  };
}
