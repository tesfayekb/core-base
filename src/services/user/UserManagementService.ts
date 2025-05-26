import { supabase } from '@/integrations/supabase/client';
import { auditLogger } from '../audit/AuditLogger';

export interface UserRole {
  id: string;
  role_id: string;
  role: {
    id: string;
    name: string;
    description?: string;
    is_system_role: boolean;
  };
  assigned_at: string;
  assigned_by?: string;
}

export interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  created_at: string;
  last_login_at?: string;
  failed_login_attempts?: number;
  email_verified_at?: string;
  roles?: UserRole[];
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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

class UserManagementService {
  async getUsers(tenantId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResult<UserWithRoles>> {
    try {
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      // Get users with their roles
      const { data: users, error: usersError, count } = await supabase
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
          email_verified_at,
          user_roles!inner (
            id,
            role_id,
            assigned_at,
            assigned_by,
            roles!inner (
              id,
              name,
              description,
              is_system_role
            )
          )
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .range(start, end)
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      // Transform the data to match our interface
      const transformedUsers: UserWithRoles[] = (users || []).map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        status: user.status,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        failed_login_attempts: user.failed_login_attempts,
        email_verified_at: user.email_verified_at,
        roles: (user.user_roles || []).map((userRole: any) => ({
          id: userRole.id,
          role_id: userRole.role_id,
          role: {
            id: userRole.roles.id,
            name: userRole.roles.name,
            description: userRole.roles.description,
            is_system_role: userRole.roles.is_system_role
          },
          assigned_at: userRole.assigned_at,
          assigned_by: userRole.assigned_by
        }))
      }));

      return {
        data: transformedUsers,
        total: count || 0,
        page,
        pageSize
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize
      };
    }
  }

  async getUserRoles(userId: string, tenantId: string): Promise<UserRole[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          role_id,
          assigned_at,
          assigned_by,
          roles!inner (
            id,
            name,
            description,
            is_system_role
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      return (data || []).map((userRole: any) => ({
        id: userRole.id,
        role_id: userRole.role_id,
        role: {
          id: userRole.roles.id,
          name: userRole.roles.name,
          description: userRole.roles.description,
          is_system_role: userRole.roles.is_system_role
        },
        assigned_at: userRole.assigned_at,
        assigned_by: userRole.assigned_by
      }));
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permissions!inner (
            id,
            name,
            resource,
            action,
            description
          )
        `)
        .eq('role_id', roleId);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.permissions.id,
        name: item.permissions.name,
        resource: item.permissions.resource,
        action: item.permissions.action,
        description: item.permissions.description
      }));
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      return [];
    }
  }

  async assignRole(userId: string, roleId: string, tenantId: string, assignedBy: string): Promise<ServiceResult<void>> {
    try {
      // Check if role assignment already exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId)
        .single();

      if (existing) {
        return { success: false, error: 'Role already assigned to user' };
      }

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
      return { success: false, error: error.message || 'Failed to assign role' };
    }
  }

  async removeRole(userId: string, roleId: string, tenantId: string, removedBy: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Log the role removal
      await auditLogger.logEvent({
        eventType: 'role_assignment',
        action: 'remove_role',
        resourceType: 'user_role',
        resourceId: userId,
        details: { roleId, removedBy, tenantId },
        userId: removedBy,
        tenantId
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing role:', error);
      return { success: false, error: error.message || 'Failed to remove role' };
    }
  }

  async createUser(request: CreateUserRequest, createdBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const { email, firstName, lastName, tenantId, roleIds } = request;

      // Create the user in Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: 'defaultpassword', // You might want to generate a random password
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            tenant_id: tenantId
          }
        }
      });

      if (authError) {
        console.error('Error creating user in Supabase Auth:', authError);
        return { success: false, error: authError.message || 'Failed to create user in Supabase Auth' };
      }

      if (!authData.user?.id) {
        return { success: false, error: 'User ID not found after creation' };
      }

      // Update the user in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({
          id: authData.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          tenant_id: tenantId,
          status: 'active' // Set a default status
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (userError) {
        console.error('Error creating user in users table:', userError);
        return { success: false, error: userError.message || 'Failed to create user in users table' };
      }

      // Assign roles to the user
      if (roleIds && roleIds.length > 0) {
        for (const roleId of roleIds) {
          const assignResult = await this.assignRole(authData.user.id, roleId, tenantId, createdBy);
          if (!assignResult.success) {
            console.error(`Failed to assign role ${roleId} to user ${authData.user.id}:`, assignResult.error);
            return { success: false, error: `Failed to assign role ${roleId}: ${assignResult.error}` };
          }
        }
      }

       // Fetch the created user with roles to return
       const userWithRolesResult = await this.getUsers(tenantId, 1, 10);
       const createdUser = userWithRolesResult.data.find(user => user.id === authData.user.id);

      // Log the user creation
      await auditLogger.logUserAction('create_user', createdBy, { userId: authData.user.id, tenantId });

      return { success: true, data: createdUser };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message || 'Failed to create user' };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const { firstName, lastName, status } = request;

      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          status: status
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message || 'Failed to update user' };
      }

      // Log the user update
      await auditLogger.logUserAction('update_user', updatedBy, { userId, details: request });

      // Fetch the updated user with roles to return
      const tenantId = data.tenant_id; // Assuming tenant_id is a property in the users table
      const userWithRolesResult = await this.getUsers(tenantId, 1, 10);
      const updatedUser = userWithRolesResult.data.find(user => user.id === userId);

      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message || 'Failed to update user' };
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<ServiceResult<void>> {
    try {
      // First, delete the user from the auth system
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Error deleting user from auth:', authError);
        return { success: false, error: authError.message || 'Failed to delete user from auth' };
      }

      // Then, delete the user from the users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        console.error('Error deleting user from users table:', userError);
        return { success: false, error: userError.message || 'Failed to delete user from users table' };
      }

      // Log the user deletion
      await auditLogger.logUserAction('delete_user', deletedBy, { userId });

      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message || 'Failed to delete user' };
    }
  }
}

export const userManagementService = new UserManagementService();
