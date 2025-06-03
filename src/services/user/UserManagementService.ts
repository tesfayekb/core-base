
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  tenant_id: string;
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface UserWithRoles extends User {
  roles?: UserRole[];
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  tenant_id: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  status?: string;
}

export class UserManagementService {
  static async getAllUsers(): Promise<UserWithRoles[]> {
    try {
      console.log('🔍 UserManagementService.getAllUsers called');
      
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          status,
          tenant_id
        `);

      if (error) {
        console.error('❌ Error fetching users:', error);
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      console.log('✅ Successfully fetched users:', users?.length || 0);
      return users || [];
    } catch (error) {
      console.error('❌ UserManagementService.getAllUsers error:', error);
      throw error;
    }
  }

  static async getUsersByTenant(tenantId: string): Promise<UserWithRoles[]> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          status,
          tenant_id
        `)
        .eq('tenant_id', tenantId);

      if (error) {
        throw new Error(`Failed to fetch users for tenant: ${error.message}`);
      }

      return users || [];
    } catch (error) {
      console.error('Error fetching users by tenant:', error);
      throw error;
    }
  }

  static async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }

      return user;
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
        throw new Error(`Failed to delete user: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select(`
          role:roles(
            id,
            name,
            description
          )
        `)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch user roles: ${error.message}`);
      }

      return roles?.map(r => r.role).filter(Boolean) || [];
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw error;
    }
  }

  static async assignRoles(userId: string, roleIds: string[]): Promise<void> {
    try {
      // First remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then assign new roles
      if (roleIds.length > 0) {
        const assignments = roleIds.map(roleId => ({
          user_id: userId,
          role_id: roleId
        }));

        const { error } = await supabase
          .from('user_roles')
          .insert(assignments);

        if (error) {
          throw new Error(`Failed to assign roles: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error assigning roles:', error);
      throw error;
    }
  }
}

// Export default instance for backward compatibility
export const userManagementService = UserManagementService;
