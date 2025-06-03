
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserManagementService } from '@/services/user/UserManagementService';
import { UserWithRoles, CreateUserRequest, UpdateUserRequest } from '@/types/user';

export function useUserManagement(tenantId?: string) {
  const { user: currentUser, currentTenantId } = useAuth();
  const queryClient = useQueryClient();

  // Use provided tenantId, fallback to currentTenantId, or fetch all users if neither available
  const effectiveTenantId = tenantId || currentTenantId;

  // Fetch users from Supabase with roles and fresh data
  const {
    data: usersResult,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users', effectiveTenantId, 'with-fresh-data'],
    queryFn: async () => {
      console.log('Fetching users with tenant filter:', effectiveTenantId);
      
      // Check if user is SuperAdmin by querying user_roles directly
      let isSuperAdmin = false;
      
      if (currentUser?.id) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select(`
            roles!user_roles_role_id_fkey(
              name
            )
          `)
          .eq('user_id', currentUser.id);
        
        if (!roleError && roleData) {
          isSuperAdmin = roleData.some((ur: any) => ur.roles?.name === 'SuperAdmin');
          console.log('SuperAdmin check result:', isSuperAdmin);
        }
      }
      
      // For SuperAdmin, don't apply any tenant filtering to show all users
      // For regular users, apply tenant filtering
      return await UserManagementService.getUsers({
        tenantId: !isSuperAdmin ? effectiveTenantId : undefined,
        isSuperAdmin
      });
    },
    enabled: !!currentUser, // Only fetch when user is logged in
    staleTime: 0, // Always consider data stale to ensure fresh data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: (failureCount, error) => {
      console.error('Query failed:', error);
      return failureCount < 2; // Retry up to 2 times
    }
  });

  const users = usersResult?.users || [];

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
    return user?.user_roles?.map(ur => ur.roles) || [];
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
