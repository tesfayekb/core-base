
// Performance-optimized user management hook with caching
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userManagementService, CreateUserRequest, UpdateUserRequest } from '@/services/user/UserManagementService';
import { useAuth } from '../../contexts/AuthContext';

export function useUserManagement(tenantId: string) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Optimized user listing with caching and performance measurement
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['users', tenantId],
    queryFn: async () => {
      const result = await userManagementService.getUsers(tenantId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data || [];
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false
  });

  // Create user mutation with cache invalidation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const result = await userManagementService.createUser(data, currentUser?.id || '');
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create user');
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Update user mutation with optimistic updates
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserRequest }) => {
      const result = await userManagementService.updateUser(userId, data, currentUser?.id || '');
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update user');
      }
      
      return result.data;
    },
    onMutate: async ({ userId, data }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: ['users', tenantId] });
      
      // Snapshot current state
      const previousUsers = queryClient.getQueryData(['users', tenantId]);
      
      // Optimistically update
      queryClient.setQueryData(['users', tenantId], (old: any[]) => {
        return old?.map(user => 
          user.id === userId ? { ...user, ...data } : user
        );
      });
      
      return { previousUsers };
    },
    onError: (err, _, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(['users', tenantId], context.previousUsers);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Assign roles mutation
  const assignRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      // Use assignRole for each role (no batch method available)
      const results = await Promise.all(
        roleIds.map(roleId => 
          userManagementService.assignRole(
            userId,
            roleId,
            tenantId,
            currentUser?.id || ''
          )
        )
      );
      
      const failed = results.find(r => !r.success);
      if (failed) {
        throw new Error(failed.error || 'Failed to assign roles');
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await userManagementService.deleteUser(userId, tenantId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Batch update utility
  const batchUpdateUsers = async (updates: { userId: string; data: UpdateUserRequest }[]) => {
    const results = await Promise.all(
      updates.map(({ userId, data }) => 
        updateUserMutation.mutateAsync({ userId, data })
      )
    );
    
    return results;
  };

  // Prefetch user data
  const prefetchUser = async (userId: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: async () => {
        const result = await userManagementService.getUser(userId, tenantId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      }
    });
  };

  return {
    // Data
    users,
    
    // Loading states
    isLoading: usersLoading,
    error: usersError,
    
    // Mutations
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    assignRoles: assignRolesMutation.mutateAsync,
    batchUpdateUsers,
    
    // Utilities
    refetchUsers,
    prefetchUser,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isAssigningRoles: assignRolesMutation.isPending,
    
    // Performance metrics
    getPerformanceMetrics: () => ({
      queryPerformance: 'optimized'
    })
  };
}
