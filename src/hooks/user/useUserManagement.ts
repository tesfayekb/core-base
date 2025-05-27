// Performance-optimized user management hook with caching
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userManagementService, CreateUserRequest, UpdateUserRequest } from '@/services/user/UserManagementService';
import { userCacheService } from '@/services/user/UserCacheService';
import { useAuth } from '../../contexts/AuthContext';
import { optimizedPerformanceMeasurement } from '@/services/performance/OptimizedPerformanceMeasurement';

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
      return optimizedPerformanceMeasurement.measureOperation(
        'complexQuery',
        async () => {
          // Check cache first
          const cacheKey = `users_${tenantId}`;
          const cached = userCacheService.getCachedQuery(cacheKey);
          if (cached) {
            return cached;
          }

          // Fetch from service
          const result = await userManagementService.getUsers(tenantId);
          
          // Cache the result
          userCacheService.setCachedQuery(cacheKey, result.data);
          return result.data;
        }
      );
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false
  });

  // Create user mutation with cache invalidation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      return optimizedPerformanceMeasurement.measureOperation(
        'complexQuery',
        async () => {
          const result = await userManagementService.createUser(data, tenantId);
          
          if (!result || !result.data) {
            throw new Error('Failed to create user');
          }
          
          // Invalidate caches
          userCacheService.invalidateUser(result.data.id);
          queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
          
          // Add to cache
          userCacheService.setCachedUser(result.data.id, result.data);
          
          return result.data;
        }
      );
    },
    onSuccess: (result) => {
      // Additional actions on success if needed
    }
  });

  // Update user mutation with optimistic updates
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserRequest }) => {
      return optimizedPerformanceMeasurement.measureOperation(
        'complexQuery',
        async () => {
          const result = await userManagementService.updateUser(userId, data, tenantId);
          
          if (!result || !result.data) {
            throw new Error('Failed to update user');
          }
          
          // Update caches
          userCacheService.setCachedUser(userId, result.data);
          userCacheService.invalidateUser(userId);
          queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
          queryClient.invalidateQueries({ queryKey: ['user', userId] });
          
          return result.data;
        }
      );
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
    }
  });

  // Assign roles mutation
  const assignRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      return optimizedPerformanceMeasurement.measureOperation(
        'permissionCheck',
        async () => {
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
          
          // Invalidate caches
          userCacheService.invalidateUser(userId);
          queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
          queryClient.invalidateQueries({ queryKey: ['user', userId] });
          
          return { success: true };
        }
      );
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return optimizedPerformanceMeasurement.measureOperation(
        'complexQuery',
        async () => {
          const result = await userManagementService.deleteUser(userId, tenantId);
          
          if (!result || !result.success) {
            throw new Error(result?.error || 'Failed to delete user');
          }
          
          // Remove from cache
          userCacheService.invalidateUser(userId);
          queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
          
          return result;
        }
      );
    }
  });

  // Batch update utility
  const batchUpdateUsers = async (updates: { userId: string; data: UpdateUserRequest }[]) => {
    return optimizedPerformanceMeasurement.measureOperation(
      'complexQuery',
      async () => {
        const results = await Promise.all(
          updates.map(({ userId, data }) => 
            updateUserMutation.mutateAsync({ userId, data })
          )
        );
        
        // Clear query cache after batch update
        userCacheService.invalidateQuery(`users_${tenantId}`);
        
        return results;
      }
    );
  };

  // Prefetch user data
  const prefetchUser = async (userId: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => userManagementService.getUser(userId, tenantId)
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
    
    // Cache management
    clearCache: () => userCacheService.invalidateQuery(`users_${tenantId}`),
    
    // Performance metrics
    getPerformanceMetrics: () => ({
      cacheStats: userCacheService.getCacheStats(),
      queryPerformance: 'optimized'
    })
  };
}
