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
      
      let query = supabase
        .from('users')
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
        `, { count: 'exact' });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
        console.log('Applied status filter:', filters.status);
      }

      // Only filter by tenant if not SuperAdmin and tenantId is provided
      if (!isSuperAdmin && filters.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
        console.log('Applied tenant filter for non-SuperAdmin:', filters.tenantId);
      } else if (isSuperAdmin) {
        console.log('SuperAdmin access - no tenant filtering applied');
      }

      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
        console.log('Applied search filter:', filters.search);
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
      console.log('Raw user data:', data);

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
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          status: userData.status || 'pending_verification',
          tenant_id: userData.tenant_id,
          password_hash: 'supabase_managed'
        }])
        .select()
        .single();

      if (error) {
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
        .select()
        .single();

      if (error) {
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
