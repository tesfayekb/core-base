
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Define User types based on actual database structure
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  tenant_id: string;
  status?: string;
  created_at?: string;
  last_login_at?: string;
  metadata?: Record<string, any>;
  user_roles?: UserRole[];
}

export interface UserRole {
  id: string;
  role: {
    id: string;
    name: string;
    description?: string;
  };
  assigned_at: string;
}

export interface CreateUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  tenantId: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export function useUserManagement(tenantId: string) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch users from Supabase with roles
  const {
    data: users = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['users', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      console.log('Fetching users for tenant:', tenantId);
      
      // First fetch users from the users table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error(usersError.message);
      }
      
      console.log('Users data:', usersData);
      
      if (!usersData || usersData.length === 0) {
        return [];
      }
      
      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        usersData.map(async (user) => {
          const { data: rolesData, error: rolesError } = await supabase
            .from('user_roles')
            .select(`
              id,
              assigned_at,
              role:roles (
                id,
                name,
                description
              )
            `)
            .eq('user_id', user.id)
            .eq('tenant_id', tenantId);
          
          if (rolesError) {
            console.error('Error fetching roles for user:', user.id, rolesError);
          }
          
          return {
            ...user,
            user_roles: rolesData || []
          };
        })
      );
      
      console.log('Users with roles:', usersWithRoles);
      return usersWithRoles;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const { data: insertData, error } = await supabase
        .from('users')
        .insert([{
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          status: data.status || 'pending_verification',
          tenant_id: data.tenantId,
          password_hash: 'temp_hash', // This should be handled by proper auth flow
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating user:', error);
        throw new Error(error.message);
      }
      
      return insertData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserRequest }) => {
      const { data: updateData, error } = await supabase
        .from('users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          status: data.status,
          metadata: data.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user:', error);
        throw new Error(error.message);
      }
      
      return updateData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .eq('tenant_id', tenantId);
      
      if (error) {
        console.error('Error deleting user:', error);
        throw new Error(error.message);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
    }
  });

  // Assign roles mutation
  const assignRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      // First delete existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);
        
      // Then add new roles
      const { error } = await supabase
        .from('user_roles')
        .insert(
          roleIds.map(roleId => ({
            user_id: userId,
            role_id: roleId,
            tenant_id: tenantId,
            assigned_by: currentUser?.id,
            assigned_at: new Date().toISOString()
          }))
        );
      
      if (error) {
        console.error('Error assigning roles:', error);
        throw new Error(error.message);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
    }
  });

  // Get user roles
  const getUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error('Error fetching user roles:', error);
      throw new Error(error.message);
    }
    
    return data?.map(item => item.roles) || [];
  };

  // Get user by ID
  const getUser = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) {
      console.error('Error fetching user:', error);
      throw new Error(error.message);
    }
    
    return data;
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
