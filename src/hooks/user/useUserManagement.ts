
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { UserManagementService, UserFilters, PaginationOptions } from '@/services/user/UserManagementService';
import { UserWithRoles, CreateUserRequest, UpdateUserRequest } from '@/types/user';

export function useUserManagement(tenantId?: string) {
  const { user: currentUser, currentTenantId } = useAuth();
  const queryClient = useQueryClient();

  // Use provided tenantId, fallback to currentTenantId, or fetch all users if neither available
  const effectiveTenantId = tenantId || currentTenantId;

  // Fetch users from Supabase with roles
  const {
    data: usersResult,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users', effectiveTenantId],
    queryFn: async () => {
      console.log('Fetching users with tenant filter:', effectiveTenantId);
      
      // Check if user is SuperAdmin by looking at user roles in the debug data
      const { data: userData } = await supabase
        .from('users')
        .select(`
          user_roles!inner(
            roles!inner(
              name
            )
          )
        `)
        .eq('id', currentUser?.id)
        .single();
      
      const isSuperAdmin = userData?.user_roles?.some((ur: any) => ur.roles?.name === 'SuperAdmin') || false;
      
      const filters: UserFilters = {};
      
      // Only filter by tenant if not SuperAdmin
      if (!isSuperAdmin && effectiveTenantId) {
        filters.tenantId = effectiveTenantId;
      }
      
      return await UserManagementService.getUsers(
        filters,
        { page: 1, limit: 50 },
        isSuperAdmin
      );
    },
    enabled: !!currentUser, // Only fetch when user is logged in
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      console.error('Query failed:', error);
      return failureCount < 2; // Retry up to 2 times
    }
  });

  const users = usersResult?.data || [];

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      return await UserManagementService.createUser(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserRequest }) => {
      return await UserManagementService.updateUser(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await UserManagementService.deleteUser(userId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  // Assign roles mutation
  const assignRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      const tenantForRoles = effectiveTenantId || 'default';
      await UserManagementService.assignRoles(userId, roleIds, tenantForRoles);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
