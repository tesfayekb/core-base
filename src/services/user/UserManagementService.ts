
import { supabase } from '@/integrations/supabase/client';
import { UserWithRoles, CreateUserRequest, UpdateUserRequest } from '@/types/user';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserFilters {
  status?: string;
  role?: string;
  tenantId?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class UserManagementService {
  static async getUsers(
    filters: UserFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
    isSuperAdmin: boolean = false
  ): Promise<PaginatedResult<UserWithRoles>> {
    try {
      console.log('UserManagementService.getUsers called with:', { filters, pagination, isSuperAdmin });
      
      // Force sync all users from auth to ensure fresh data
      await this.syncAllUsersFromAuth();
      
      let query = supabase
        .from('users')
        .select(`
          *,
          tenants!users_tenant_id_fkey(
            id,
            name,
            slug
          ),
          user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles!user_roles_role_id_fkey(
              id,
              name,
              description
            )
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Critical fix: For SuperAdmin, skip tenant filtering entirely
      // For regular users, apply tenant filtering only if tenantId is provided
      if (!isSuperAdmin && filters.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
        console.log('Applied tenant filter for regular user:', filters.tenantId);
      } else if (isSuperAdmin) {
        console.log('SuperAdmin access - fetching all users without tenant restrictions');
      }

      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      console.log('Executing Supabase query...');
      const { data, error, count } = await query;

      if (error) {
        console.error('Supabase error fetching users:', error);
        throw error;
      }

      console.log('Successfully fetched users:', data?.length || 0, 'total count:', count);

      return {
        data: data || [],
        total: count || 0,
        page: pagination.page,
        pageSize: pagination.limit,
        totalPages: Math.ceil((count || 0) / pagination.limit)
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Force sync users from auth.users to ensure fresh last_login_at data
  static async syncAllUsersFromAuth(): Promise<void> {
    try {
      console.log('Syncing all users from auth...');
      const { data, error } = await supabase.rpc('force_sync_all_users');
      
      if (error) {
        console.error('Error syncing users from auth:', error);
      } else {
        console.log('Successfully synced users from auth:', data);
      }
    } catch (error) {
      console.error('Error in syncAllUsersFromAuth:', error);
    }
  }

  static async getUserById(id: string): Promise<UserWithRoles | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            role:roles!user_roles_role_id_fkey(
              id,
              name,
              description
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching user by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  static async createUser(userData: CreateUserRequest): Promise<UserWithRoles> {
    try {
      // First, set the tenant context to avoid RLS issues
      if (userData.tenant_id) {
        const { error: contextError } = await supabase.rpc('set_tenant_context', {
          tenant_id: userData.tenant_id
        });
        
        if (contextError) {
          console.error('Error setting tenant context:', contextError);
        }
      }

      // Create user with proper tenant context
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          status: userData.status || 'pending_verification',
          tenant_id: userData.tenant_id,
          password_hash: 'temp_hash', // This will be managed by auth system
          metadata: {}
        }])
        .select(`
          *,
          user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles!user_roles_role_id_fkey(
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

      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(id: string, userData: UpdateUserRequest): Promise<UserWithRoles> {
    try {
      // Get the current user to check tenant context
      const { data: currentUser, error: getCurrentError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', id)
        .single();

      if (getCurrentError) {
        console.error('Error getting current user:', getCurrentError);
        throw getCurrentError;
      }

      // Set tenant context if available
      if (currentUser?.tenant_id) {
        const { error: contextError } = await supabase.rpc('set_tenant_context', {
          tenant_id: currentUser.tenant_id
        });
        
        if (contextError) {
          console.error('Error setting tenant context:', contextError);
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          status: userData.status,
          metadata: userData.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles!user_roles_role_id_fkey(
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

      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async deleteUser(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async assignRoles(userId: string, roleIds: string[], tenantId: string): Promise<void> {
    try {
      // First delete existing roles for this user in this tenant
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      // Then add new roles
      if (roleIds.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .insert(
            roleIds.map(roleId => ({
              user_id: userId,
              role_id: roleId,
              tenant_id: tenantId,
              assigned_at: new Date().toISOString()
            }))
          );

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error assigning roles:', error);
      throw error;
    }
  }
}

export type { UserWithRoles, CreateUserRequest, UpdateUserRequest };
