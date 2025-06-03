
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserManagementService, UserFilters, PaginationOptions } from '@/services/user/UserManagementService';
import { UserWithRoles, CreateUserRequest, UpdateUserRequest } from '@/types/user';

export function useUserManagement(tenantId: string) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch users from Supabase with roles
  const {
    data: usersResult,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users', tenantId],
    queryFn: async () => {
      if (!tenantId) return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
      
      console.log('Fetching users for tenant:', tenantId);
      
      return await UserManagementService.getUsers(
        { tenantId },
        { page: 1, limit: 50 } // Get more users for now
      );
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const users = usersResult?.data || [];

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      return await UserManagementService.createUser(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserRequest }) => {
      return await UserManagementService.updateUser(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await UserManagementService.deleteUser(userId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Assign roles mutation
  const assignRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      await UserManagementService.assignRoles(userId, roleIds, tenantId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
    }
  });

  // Get user roles
  const getUserRoles = async (userId: string) => {
    const user = await UserManagementService.getUserById(userId);
    return user?.user_roles?.map(ur => ur.role) || [];
  };

  // Get user by ID
  const getUser = async (userId: string) => {
    return await UserManagementService.getUserById(userId);
  };

  return {
    // Data
    users,
    
    // Loading states
    isLoading,
    error,
    
    // CRUD operations
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    assignRoles: assignRolesMutation.mutateAsync,
    getUserRoles,
    getUser,
    
    // Refetch
    refetch
  };
}
