
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
  failed_login_attempts: number;
  email_verified_at?: string;
  tenant_id: string;
  roles?: Role[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system_role: boolean;
  assigned_at?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  expires_at?: string;
  role: Role;
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

class UserManagementService {
  async getUsers(tenantId: string, page: number = 1, limit: number = 10): Promise<ServiceResult<UserWithRoles[]>> {
    try {
      const offset = (page - 1) * limit;

      // Get users with their roles
      const { data: users, error: usersError } = await supabase
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
          tenant_id
        `)
        .eq('tenant_id', tenantId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Get user roles for all users
      const userIds = users?.map(u => u.id) || [];
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          assigned_at,
          role_id,
          roles!inner(
            id,
            name,
            description,
            is_system_role
          )
        `)
        .in('user_id', userIds)
        .eq('tenant_id', tenantId);

      if (rolesError) throw rolesError;

      // Map roles to users
      const usersWithRoles: UserWithRoles[] = (users || []).map(user => {
        const userRoleAssignments = userRoles?.filter(ur => ur.user_id === user.id) || [];
        const roles = userRoleAssignments.map(ur => ({
          id: ur.roles.id,
          name: ur.roles.name,
          description: ur.roles.description,
          is_system_role: ur.roles.is_system_role,
          assigned_at: ur.assigned_at
        }));

        return {
          ...user,
          roles
        };
      });

      return {
        success: true,
        data: usersWithRoles
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      };
    }
  }

  async getUserRoles(userId: string, tenantId: string): Promise<ServiceResult<UserRole[]>> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
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

      const userRoles: UserRole[] = (data || []).map(ur => ({
        id: ur.id,
        user_id: ur.user_id,
        role_id: ur.role_id,
        assigned_at: ur.assigned_at,
        expires_at: ur.expires_at,
        role: {
          id: ur.roles.id,
          name: ur.roles.name,
          description: ur.roles.description,
          is_system_role: ur.roles.is_system_role
        }
      }));

      return {
        success: true,
        data: userRoles
      };
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user roles'
      };
    }
  }

  async getAvailableRoles(tenantId: string): Promise<ServiceResult<Role[]>> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, is_system_role')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;

      const roles: Role[] = (data || []).map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        is_system_role: role.is_system_role
      }));

      return {
        success: true,
        data: roles
      };
    } catch (error) {
      console.error('Error fetching available roles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch available roles'
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

      if (error) throw error;

      // Log the role assignment
      await auditLogger.logRoleAssignment(userId, roleId, assignedBy, tenantId);

      return { success: true };
    } catch (error) {
      console.error('Error assigning role:', error);
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

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error removing role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove role'
      };
    }
  }

  async getRolePermissions(roleId: string, tenantId: string): Promise<ServiceResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permissions!inner(
            id,
            name,
            resource,
            action
          )
        `)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const permissions = (data || []).map(rp => ({
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
      console.error('Error fetching role permissions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch role permissions'
      };
    }
  }

  async createUser(request: CreateUserRequest, createdBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      // In a real implementation, this would create the user in auth.users
      // For now, we'll simulate the creation
      const newUser = {
        id: crypto.randomUUID(),
        email: request.email,
        first_name: request.firstName,
        last_name: request.lastName,
        status: 'active',
        tenant_id: request.tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        failed_login_attempts: 0,
        roles: []
      };

      return {
        success: true,
        data: newUser as UserWithRoles
      };
    } catch (error) {
      console.error('Error creating user:', error);
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

      if (error) throw error;

      return {
        success: true,
        data: { ...data, roles: [] } as UserWithRoles
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      };
    }
  }
}

export const userManagementService = new UserManagementService();
