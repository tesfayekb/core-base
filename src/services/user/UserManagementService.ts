
import { supabase } from '@/integrations/supabase/client';
import { auditLogger } from '@/services/audit/AuditLogger';

export interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  failed_login_attempts?: number;
  email_verified_at?: string;
  tenant_id: string;
  roles?: Array<{
    id: string;
    name: string;
    description?: string;
    is_system_role: boolean;
  }>;
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

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class UserManagementService {
  private static instance: UserManagementService;

  static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  async getUsers(tenantId: string, page = 1, limit = 10): Promise<ServiceResult<UserWithRoles[]>> {
    try {
      const offset = (page - 1) * limit;
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          status,
          created_at,
          updated_at,
          last_login_at,
          failed_login_attempts,
          email_verified_at,
          tenant_id,
          user_roles!inner(
            roles!inner(
              id,
              name,
              description,
              is_system_role
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const users: UserWithRoles[] = data?.map(user => ({
        ...user,
        roles: user.user_roles?.map(ur => ur.roles).filter(Boolean) || []
      })) || [];

      return {
        success: true,
        data: users
      };
    } catch (error) {
      console.error('Get users error:', error);
      return {
        success: false,
        error: 'Failed to fetch users'
      };
    }
  }

  async getUserById(userId: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          status,
          created_at,
          updated_at,
          last_login_at,
          failed_login_attempts,
          email_verified_at,
          tenant_id,
          user_roles(
            roles(
              id,
              name,
              description,
              is_system_role
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      const user: UserWithRoles = {
        ...data,
        roles: data.user_roles?.map(ur => ur.roles).filter(Boolean) || []
      };

      return {
        success: true,
        data: user
      };
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        error: 'Failed to fetch user'
      };
    }
  }

  async createUser(request: CreateUserRequest, createdBy: string): Promise<ServiceResult> {
    try {
      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          tenant_id: request.tenantId,
          status: 'pending_verification'
        })
        .select()
        .single();

      if (userError) throw userError;

      // Assign roles if provided
      if (request.roleIds && request.roleIds.length > 0) {
        const roleAssignments = request.roleIds.map(roleId => ({
          user_id: userData.id,
          tenant_id: request.tenantId,
          role_id: roleId,
          assigned_by: createdBy
        }));

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(roleAssignments);

        if (roleError) throw roleError;
      }

      await auditLogger.logUserAction('create_user', userData.id, {
        email: request.email,
        tenantId: request.tenantId,
        createdBy
      });

      return {
        success: true,
        message: 'User created successfully',
        data: userData
      };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        error: 'Failed to create user'
      };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<ServiceResult> {
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

      if (error) throw error;

      await auditLogger.logUserAction('update_user', userId, {
        changes: request,
        updatedBy
      });

      return {
        success: true,
        message: 'User updated successfully',
        data
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: 'Failed to update user'
      };
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      await auditLogger.logUserAction('delete_user', userId, {
        deletedBy
      });

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        error: 'Failed to delete user'
      };
    }
  }

  async getUserRoles(userId: string, tenantId: string): Promise<ServiceResult> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          role_id,
          assigned_at,
          expires_at,
          roles!inner(
            id,
            name,
            description,
            is_system_role
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Fix: Access array elements properly
      const roles = data?.map(userRole => ({
        id: userRole.id,
        role_id: userRole.role_id,
        assigned_at: userRole.assigned_at,
        expires_at: userRole.expires_at,
        role: userRole.roles
      })) || [];

      return {
        success: true,
        data: roles
      };
    } catch (error) {
      console.error('Get user roles error:', error);
      return {
        success: false,
        error: 'Failed to fetch user roles'
      };
    }
  }

  async getAvailableRoles(tenantId: string): Promise<ServiceResult> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, is_system_role')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;

      // Fix: Access array elements properly
      const roles = data?.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        is_system_role: role.is_system_role
      })) || [];

      return {
        success: true,
        data: roles
      };
    } catch (error) {
      console.error('Get available roles error:', error);
      return {
        success: false,
        error: 'Failed to fetch available roles'
      };
    }
  }

  async assignRole(userId: string, roleId: string, tenantId: string, assignedBy: string): Promise<ServiceResult> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          role_id: roleId,
          assigned_by: assignedBy
        })
        .select()
        .single();

      if (error) throw error;

      await auditLogger.logRoleAssignment(userId, roleId, assignedBy, tenantId);

      return {
        success: true,
        message: 'Role assigned successfully',
        data
      };
    } catch (error) {
      console.error('Assign role error:', error);
      return {
        success: false,
        error: 'Failed to assign role'
      };
    }
  }

  async removeRole(userRoleId: string, removedBy: string): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRoleId);

      if (error) throw error;

      await auditLogger.logUserAction('remove_role', userRoleId, {
        removedBy
      });

      return {
        success: true,
        message: 'Role removed successfully'
      };
    } catch (error) {
      console.error('Remove role error:', error);
      return {
        success: false,
        error: 'Failed to remove role'
      };
    }
  }
}

export const userManagementService = UserManagementService.getInstance();
