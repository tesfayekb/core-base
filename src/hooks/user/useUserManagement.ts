
// Performance-optimized user management hook with caching
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userManagementService, CreateUserRequest, UpdateUserRequest } from '@/services/user/UserManagementService';
import { userCacheService } from '@/services/user/UserCacheService';
import { useAuth } from '@/contexts/AuthContext';
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
        'database_query',
        async () => {
          // Check cache first
          const cacheKey = `users_${tenantId}`;
          const cached = userCacheService.getCachedQuery(cacheKey);
          if (cached) {
            return cached;
          }

          // Fetch from service
          const result = await userManagementService.getUsersByTenant(tenantId);
          
          if (result.success && result.data) {
            // Cache the result
            userCacheService.setCachedQuery(cacheKey, result.data);
            return result.data;
          }
          
          throw new Error(result.error || 'Failed to fetch users');
        }
      );
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false
  });

  // Create user mutation with cache invalidation
  const createUserMutation = useMutation({
    mutationFn: async (createRequest: CreateUserRequest) => {
      if (!currentUser?.id) throw new Error('User not authenticated');
      
      return optimizedPerformanceMeasurement.measureOperation(
        'api_call',
        () => userManagementService.createUser(createRequest, currentUser.id)
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate and refetch users list
        queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
        
        // Clear related caches
        userCacheService.invalidateQuery(`users_${tenantId}`);
        
        // Cache the new user
        if (result.data) {
          userCacheService.setCachedUser(result.data.id, result.data);
        }
      }
    }
  });

  // Update user mutation with cache invalidation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updateRequest }: { userId: string; updateRequest: UpdateUserRequest }) => {
      if (!currentUser?.id) throw new Error('User not authenticated');
      
      return optimizedPerformanceMeasurement.measureOperation(
        'api_call',
        () => userManagementService.updateUser(userId, updateRequest, currentUser.id)
      );
    },
    onSuccess: (result, { userId }) => {
      if (result.success) {
        // Invalidate and refetch users list
        queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
        
        // Update cached user
        if (result.data) {
          userCacheService.setCachedUser(userId, result.data);
        }
        
        // Clear query cache
        userCacheService.invalidateQuery(`users_${tenantId}`);
      }
    }
  });

  // Delete user mutation with cache invalidation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentUser?.id) throw new Error('User not authenticated');
      
      return optimizedPerformanceMeasurement.measureOperation(
        'api_call',
        () => userManagementService.deleteUser(userId, currentUser.id)
      );
    },
    onSuccess: (result, userId) => {
      if (result.success) {
        // Invalidate and refetch users list
        queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
        
        // Remove from cache
        userCacheService.invalidateUser(userId);
        userCacheService.invalidateQuery(`users_${tenantId}`);
      }
    }
  });

  // Role assignment mutation with cache management
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      if (!currentUser?.id) throw new Error('User not authenticated');
      
      return optimizedPerformanceMeasurement.measureOperation(
        'api_call',
        () => userManagementService.assignRole(userId, roleId, tenantId, currentUser.id)
      );
    },
    onSuccess: (result, { userId }) => {
      if (result.success) {
        // Invalidate user and users list
        queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['user', userId] });
        
        // Clear caches
        userCacheService.invalidateUser(userId);
        userCacheService.invalidateQuery(`users_${tenantId}`);
      }
    }
  });

  // Batch operations for performance
  const batchUpdateUsers = async (updates: Array<{ userId: string; updateRequest: UpdateUserRequest }>) => {
    const startTime = performance.now();
    
    try {
      const promises = updates.map(({ userId, updateRequest }) => 
        updateUserMutation.mutateAsync({ userId, updateRequest })
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`Batch update completed: ${successful}/${updates.length} successful in ${performance.now() - startTime}ms`);
      
      return { successful, total: updates.length };
    } catch (error) {
      console.error('Batch update failed:', error);
      throw error;
    }
  };

  return {
    // Data
    users,
    usersLoading,
    usersError,
    
    // Actions
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    assignRole: assignRoleMutation.mutateAsync,
    batchUpdateUsers,
    
    // Utilities
    refetchUsers,
    
    // Loading states
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isAssigningRole: assignRoleMutation.isPending,
    
    // Cache management
    clearCache: () => userCacheService.invalidateQuery(`users_${tenantId}`),
    getCacheStats: () => userCacheService.getCacheStats()
  };
}
