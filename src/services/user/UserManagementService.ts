import { supabase } from '@/integrations/supabase/client';
import { UserWithRoles, CreateUserRequest, UpdateUserRequest } from '@/types/user';

export class UserManagementService {
  /**
   * Get users with optional filtering, pagination, and tenant isolation
   */
  static async getUsers(options: {
    filters?: {
      search?: string;
      status?: string;
      role?: string;
      tenant?: string;
    };
    pagination?: {
      page?: number;
      limit?: number;
    };
    sorting?: {
      field?: string;
      direction?: 'asc' | 'desc';
    };
    tenantId?: string;
    isSuperAdmin?: boolean;
  } = {}): Promise<{ users: UserWithRoles[]; totalCount: number }> {
    const {
      filters = {},
      pagination = { page: 1, limit: 50 },
      sorting = { field: 'created_at', direction: 'desc' },
      tenantId,
      isSuperAdmin = false
    } = options;

    console.log('UserManagementService.getUsers called with:', {
      filters,
      pagination,
      isSuperAdmin,
      tenantId
    });

    try {
      // First sync users from auth to ensure we have the latest data
      if (isSuperAdmin) {
        console.log('Syncing all users from auth...');
        const { data: syncResult } = await supabase.rpc('force_sync_all_users');
        console.log('Successfully synced users from auth:', syncResult || 0);
      }

      // Build the query - fix the ambiguous relationship by specifying the exact foreign key
      let query = supabase
        .from('users')
        .select(`
          *,
          user_roles:user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles:roles(
              id,
              name,
              description
            )
          )
        `, { count: 'exact' });

      // Apply tenant filtering (unless superadmin wants all users)
      if (!isSuperAdmin && tenantId) {
        console.log('Applying tenant filter:', tenantId);
        query = query.eq('tenant_id', tenantId);
      } else if (isSuperAdmin) {
        console.log('SuperAdmin access - fetching all users without tenant restrictions');
      } else {
        console.log('No tenant context - this might cause issues');
      }

      // Apply filters
      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply sorting
      if (sorting.field) {
        query = query.order(sorting.field, { ascending: sorting.direction === 'asc' });
      }

      // Apply pagination
      if (pagination.page && pagination.limit) {
        const start = (pagination.page - 1) * pagination.limit;
        const end = start + pagination.limit - 1;
        query = query.range(start, end);
      }

      console.log('Executing Supabase query...');
      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      console.log('Successfully fetched users:', data?.length || 0, 'total count:', count || 0);

      return {
        users: (data || []) as UserWithRoles[],
        totalCount: count || 0
      };
    } catch (error) {
      console.error('UserManagementService.getUsers error:', error);
      throw error;
    }
  }

  static async createUser(userData: CreateUserRequest): Promise<UserWithRoles> {
    try {
      // Set tenant context if provided
      if (userData.tenant_id) {
        await supabase.rpc('set_tenant_context', { tenant_id: userData.tenant_id });
        await supabase.rpc('set_user_context', { user_id: (await supabase.auth.getUser()).data.user?.id });
      }

      const { data, error } = await supabase
        .from('users')
        .insert({
          ...userData,
          password_hash: '', // We don't handle passwords in the public table
        })
        .select(`
          *,
          user_roles:user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles:roles(
              id,
              name,
              description
            )
          )
        `)
        .single();

      if (error) {
        console.error('Create user error:', error);
        throw error;
      }

      return data as UserWithRoles;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, userData: UpdateUserRequest): Promise<UserWithRoles> {
    try {
      // Get current user for tenant context
      const { data: currentUser } = await supabase.auth.getUser();
      if (currentUser.user) {
        await supabase.rpc('set_user_context', { user_id: currentUser.user.id });
      }

      console.log('Updating user:', userId, 'with data:', userData);

      const { data, error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select(`
          *,
          user_roles:user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles:roles(
              id,
              name,
              description
            )
          )
        `)
        .single();

      if (error) {
        console.error('Update user error:', error);
        throw error;
      }

      console.log('Successfully updated user:', data);
      return data as UserWithRoles;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Delete user error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getUserById(userId: string): Promise<UserWithRoles | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles:user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles:roles(
              id,
              name,
              description
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        console.error('Get user by ID error:', error);
        throw error;
      }

      return data as UserWithRoles;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  static async assignRoles(userId: string, roleIds: string[], tenantId: string): Promise<void> {
    try {
      // Remove existing roles for the user and tenant
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (deleteError) {
        console.error('Error deleting existing user roles:', deleteError);
        throw deleteError;
      }

      // Insert new roles for the user and tenant
      const newRoles = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        tenant_id: tenantId,
        assigned_at: new Date().toISOString()
      }));

      const { data: insertData, error: insertError } = await supabase
        .from('user_roles')
        .insert(newRoles);

      if (insertError) {
        console.error('Error assigning new roles to user:', insertError);
        throw insertError;
      }

      console.log('Successfully assigned roles to user:', insertData);
    } catch (error) {
      console.error('Error assigning roles to user:', error);
      throw error;
    }
  }
}
