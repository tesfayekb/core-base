
// User Management Service
// Handles CRUD operations for users with proper tenant isolation

import { supabase } from '@/integrations/supabase/client';

export interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  email_verified_at?: string;
  failed_login_attempts?: number;
  metadata?: Record<string, any>;
  user_roles?: Array<{
    role: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}

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
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PaginatedResult<UserWithRoles>> {
    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          user_roles(
            role:roles(
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

      if (filters.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
      }

      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

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

  static async getAllUsers(): Promise<UserWithRoles[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles(
            role:roles(
              id,
              name,
              description
            )
          )
        `);

      if (error) {
        console.error('Error fetching all users:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  static async getUserById(id: string): Promise<UserWithRoles | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles(
            role:roles(
              id,
              name,
              description
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  static async createUser(userData: Partial<UserWithRoles>): Promise<UserWithRoles> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
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

  static async updateUser(id: string, userData: Partial<UserWithRoles>): Promise<UserWithRoles> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(userData)
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
}
