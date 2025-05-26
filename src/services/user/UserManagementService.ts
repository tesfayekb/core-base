import { supabase } from '@/integrations/supabase/client';
import { auditLogger } from '@/services/audit/AuditLogger';

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  assigned_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  created_at: string;
  last_login_at?: string;
  failed_login_attempts?: number;
  email_verified_at?: string;
  roles?: Role[];
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
  status?: 'active' | 'inactive' | 'suspended' | 'pending_verification';
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export class UserManagementService {
  async getUsers(
    tenantId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ServiceResult<PaginatedResult<UserWithRoles>>> {
    try {
      const offset = (page - 1) * pageSize;

      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          status,
          created_at,
          last_login_at,
          failed_login_attempts,
          email_verified_at
        `)
        .eq('tenant_id', tenantId)
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      // Get roles for each user
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        (users || []).map(async (user) => {
          const rolesResult = await this.getUserRoles(user.id, tenantId);
          return {
            ...user,
            roles: rolesResult.success ? rolesResult.data : []
          };
        })
      );

      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      return {
        success: true,
        data: {
          data: usersWithRoles,
          total: count || 0,
          page,
          pageSize
        }
      };
    } catch (error) {
      console.error('Failed to get users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users'
      };
    }
  }

  async getUserRoles(userId: string, tenantId: string): Promise<ServiceResult<Role[]>> {
    try {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          assigned_at,
          roles (
            id,
            name,
            description,
            is_system_role
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const roles: Role[] = (userRoles || []).map(userRole => ({
        id: userRole.roles.id,
        name: userRole.roles.name,
        description: userRole.roles.description,
        is_system_role: userRole.roles.is_system_role,
        assigned_at: userRole.assigned_at
      }));

      return {
        success: true,
        data: roles
      };
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user roles',
        data: []
      };
    }
  }

  async getAvailableRoles(tenantId: string): Promise<ServiceResult<Role[]>> {
    try {
      const { data: roles, error } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          is_system_role
        `)
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;

      const formattedRoles: Role[] = (roles || []).map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        is_system_role: role.is_system_role
      }));

      return {
        success: true,
        data: formattedRoles
      };
    } catch (error) {
      console.error('Failed to get available roles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get available roles',
        data: []
      };
    }
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    tenantId: string,
    assignedBy: string
  ): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_by: assignedBy
        });

      if (error) throw error;

      // Log the role assignment
      await auditLogger.logRoleAssignment(userId, roleId, assignedBy, tenantId);

      return { success: true };
    } catch (error) {
      console.error('Failed to assign role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign role'
      };
    }
  }

  async removeRoleFromUser(
    userId: string,
    roleId: string,
    tenantId: string,
    removedBy: string
  ): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Log the role removal
      await auditLogger.logUserAction('remove_role', userId, {
        roleId,
        removedBy,
        tenantId
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to remove role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove role'
      };
    }
  }

  async getPermissionsForRole(roleId: string, tenantId: string): Promise<ServiceResult<Permission[]>> {
    try {
      const { data: rolePermissions, error } = await supabase
        .from('role_permissions')
        .select(`
          permissions (
            id,
            name,
            resource,
            action
          )
        `)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const permissions: Permission[] = (rolePermissions || []).map(rp => ({
        id: rp.permissions.id,
        name: rp.permissions.name,
        resource: rp.permissions.resource,
        action: rp.permissions.action
      }));

      return {
        success: true,
        data: permissions
      };
    } catch (error) {
      console.error('Failed to get permissions for role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get permissions for role',
        data: []
      };
    }
  }

  async createUser(request: CreateUserRequest, createdBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          tenant_id: request.tenantId,
          password_hash: 'temp_hash', // This should be properly hashed
          status: 'pending_verification'
        })
        .select()
        .single();

      if (error) throw error;

      // Assign roles if provided
      if (request.roleIds && request.roleIds.length > 0) {
        for (const roleId of request.roleIds) {
          await this.assignRoleToUser(user.id, roleId, request.tenantId, createdBy);
        }
      }

      // Get user with roles
      const userWithRoles = await this.getUserWithRoles(user.id, request.tenantId);

      await auditLogger.logUserAction('create_user', user.id, {
        email: request.email,
        createdBy,
        tenantId: request.tenantId
      });

      return {
        success: true,
        data: userWithRoles
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const { data: user, error } = await supabase
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

      // Get user with roles
      const userWithRoles = await this.getUserWithRoles(userId, user.tenant_id);

      await auditLogger.logUserAction('update_user', userId, {
        changes: request,
        updatedBy
      });

      return {
        success: true,
        data: userWithRoles
      };
    } catch (error) {
      console.error('Failed to update user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      };
    }
  }

  private async getUserWithRoles(userId: string, tenantId: string): Promise<UserWithRoles> {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const rolesResult = await this.getUserRoles(userId, tenantId);

    return {
      ...user,
      roles: rolesResult.success ? rolesResult.data : []
    };
  }
}

export const userManagementService = new UserManagementService();
