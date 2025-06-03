
import { useState, useEffect } from 'react';
import { UserManagementService, UserWithRoles } from '@/services/user/UserManagementService';

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

  return {
    users,
    isLoading,
    error,
    refetch: async () => {
      const allUsers = await UserManagementService.getAllUsers();
      setUsers(allUsers);
    }
  };
}
