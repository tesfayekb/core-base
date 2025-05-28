
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
  roles?: Array<{
    id: string;
    name: string;
    description?: string;
    assigned_at?: string;
    role: {
      id: string;
      name: string;
      description?: string;
      is_system_role?: boolean;
    };
  }>;
}

export interface UserRole {
  id: string;
  role_id: string;
  user_id: string;
  tenant_id: string;
  assigned_at: string;
  assigned_by?: string;
  role: {
    id: string;
    name: string;
    description?: string;
    is_system_role?: boolean;
  };
}

export interface Permission {
  id: string;
  name: string;
  action: string;
  resource: string;
  description?: string;
}

export interface CreateUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId: string;
  roleIds?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  status?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export class UserManagementService {
  private static instance: UserManagementService;

  static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  async createUser(request: CreateUserRequest, createdBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        return {
          success: false,
          error: 'Please provide a valid email address'
        };
      }

      // Create user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          tenant_id: request.tenantId,
          status: 'active'
        })
        .select()
        .single();

      if (userError) {
        return {
          success: false,
          error: userError.message
        };
      }

      return {
        success: true,
        data: userData as UserWithRoles
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: request.firstName,
          last_name: request.lastName,
          status: request.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as UserWithRoles
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      };
    }
  }

  async getUsers(tenantId: string): Promise<ServiceResult<UserWithRoles[]>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          roles:user_roles(
            id,
            assigned_at,
            role:roles(
              id,
              name,
              description,
              is_system_role
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as UserWithRoles[]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      };
    }
  }

  async getUser(userId: string, tenantId: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          roles:user_roles(
            id,
            assigned_at,
            role:roles(
              id,
              name,
              description,
              is_system_role
            )
          )
        `)
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as UserWithRoles
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user'
      };
    }
  }

  async getUsersByTenant(tenantId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResult<UserWithRoles>> {
    try {
      const offset = (page - 1) * pageSize;

      // Get users with count
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw error;
      }

      return {
        data: data as UserWithRoles[],
        totalCount: count || 0,
        page,
        pageSize
      };
    } catch (error) {
      console.error('Failed to get users by tenant:', error);
      return {
        data: [],
        totalCount: 0,
        page,
        pageSize
      };
    }
  }

  async getUserRoles(userId: string, tenantId: string): Promise<ServiceResult<UserRole[]>> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          role:roles(
            id,
            name,
            description,
            is_system_role
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as UserRole[]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user roles'
      };
    }
  }

  async getRolePermissions(roleId: string): Promise<ServiceResult<Permission[]>> {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permission:permissions(
            id,
            name,
            action,
            resource,
            description
          )
        `)
        .eq('role_id', roleId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const permissions = data.map(item => item.permission).filter(Boolean) as Permission[];

      return {
        success: true,
        data: permissions
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch role permissions'
      };
    }
  }

  async assignRole(userId: string, roleId: string, tenantId: string, assignedBy: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_by: assignedBy
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign role'
      };
    }
  }

  async removeRole(userId: string, roleId: string, tenantId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove role'
      };
    }
  }

  async deleteUser(userId: string, tenantId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .eq('tenant_id', tenantId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user'
      };
    }
  }
}

export const userManagementService = UserManagementService.getInstance();
