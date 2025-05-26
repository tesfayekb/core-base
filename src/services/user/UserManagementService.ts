
import { supabase } from '@/integrations/supabase/client';
import { standardizedAuditLogger } from '@/services/audit/StandardizedAuditLogger';

export interface UserWithRoles {
  id: string;
  tenant_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  email_verified_at?: string;
  last_login_at?: string;
  failed_login_attempts: number;
  locked_until?: string;
  created_at: string;
  updated_at: string;
  roles?: {
    id: string;
    name: string;
    assigned_at: string;
    is_system_role: boolean;
  }[];
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

export interface UserSearchOptions {
  tenantId: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface UserSearchResult {
  success: boolean;
  data?: UserWithRoles[];
  error?: string;
  total?: number;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class UserManagementService {
  async createUser(request: CreateUserRequest, createdBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      // Create user in auth.users first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: request.email,
        email_confirm: false,
        user_metadata: {
          first_name: request.firstName,
          last_name: request.lastName
        }
      });

      if (authError) {
        console.error('Auth user creation failed:', authError);
        await standardizedAuditLogger.logStandardizedEvent(
          'user.create.failed',
          'users',
          request.email,
          'failure',
          { userId: createdBy, tenantId: request.tenantId },
          { before: null, after: null }
        );
        return { success: false, error: authError.message };
      }

      // Create user record in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          tenant_id: request.tenantId,
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          password_hash: '', // Will be set by auth
          status: 'pending_verification'
        })
        .select()
        .single();

      if (userError) {
        console.error('User record creation failed:', userError);
        await standardizedAuditLogger.logStandardizedEvent(
          'user.create.failed',
          'users',
          authData.user.id,
          'failure',
          { userId: createdBy, tenantId: request.tenantId },
          { before: null, after: { email: request.email } }
        );
        return { success: false, error: userError.message };
      }

      // Assign roles if provided
      if (request.roleIds && request.roleIds.length > 0) {
        const roleAssignments = request.roleIds.map(roleId => ({
          user_id: authData.user.id,
          role_id: roleId,
          tenant_id: request.tenantId,
          assigned_by: createdBy
        }));

        await supabase.from('user_roles').insert(roleAssignments);
      }

      // Fetch complete user data with roles
      const createdUser = await this.getUserById(authData.user.id, request.tenantId);
      
      await standardizedAuditLogger.logStandardizedEvent(
        'user.create.success',
        'users',
        authData.user.id,
        'success',
        { userId: createdBy, tenantId: request.tenantId },
        { before: null, after: createdUser.data }
      );

      return { success: true, data: createdUser.data };
    } catch (error) {
      console.error('User creation error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create user' 
      };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      // Get current user data for audit trail
      const currentResult = await this.getUserById(userId);
      if (!currentResult.success || !currentResult.data) {
        return { success: false, error: 'User not found' };
      }

      const currentUser = currentResult.data;

      // Update user record
      const { data: userData, error: updateError } = await supabase
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

      if (updateError) {
        console.error('User update failed:', updateError);
        await standardizedAuditLogger.logStandardizedEvent(
          'user.update.failed',
          'users',
          userId,
          'failure',
          { userId: updatedBy, tenantId: currentUser.tenant_id },
          { before: currentUser, after: null }
        );
        return { success: false, error: updateError.message };
      }

      // Fetch updated user data with roles
      const updatedUser = await this.getUserById(userId, currentUser.tenant_id);
      
      await standardizedAuditLogger.logStandardizedEvent(
        'user.update.success',
        'users',
        userId,
        'success',
        { userId: updatedBy, tenantId: currentUser.tenant_id },
        { before: currentUser, after: updatedUser.data }
      );

      return { success: true, data: updatedUser.data };
    } catch (error) {
      console.error('User update error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update user' 
      };
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<ServiceResult> {
    try {
      // Get current user data for audit trail
      const currentResult = await this.getUserById(userId);
      if (!currentResult.success || !currentResult.data) {
        return { success: false, error: 'User not found' };
      }

      const currentUser = currentResult.data;

      // Delete from auth (this will cascade to related tables)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Auth user deletion failed:', authError);
        await standardizedAuditLogger.logStandardizedEvent(
          'user.delete.failed',
          'users',
          userId,
          'failure',
          { userId: deletedBy, tenantId: currentUser.tenant_id },
          { before: currentUser, after: null }
        );
        return { success: false, error: authError.message };
      }

      await standardizedAuditLogger.logStandardizedEvent(
        'user.delete.success',
        'users',
        userId,
        'success',
        { userId: deletedBy, tenantId: currentUser.tenant_id },
        { before: currentUser, after: null }
      );

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('User deletion error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete user' 
      };
    }
  }

  async getUserById(userId: string, tenantId?: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const query = supabase
        .from('users')
        .select(`
          id,
          tenant_id,
          email,
          first_name,
          last_name,
          status,
          email_verified_at,
          last_login_at,
          failed_login_attempts,
          locked_until,
          created_at,
          updated_at
        `)
        .eq('id', userId);

      if (tenantId) {
        query.eq('tenant_id', tenantId);
      }

      const { data: userData, error: userError } = await query.single();

      if (userError) {
        console.error('User fetch failed:', userError);
        return { success: false, error: userError.message };
      }

      // Fetch user roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select(`
          assigned_at,
          roles!inner(
            id,
            name,
            is_system_role
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', userData.tenant_id);

      if (roleError) {
        console.error('Role fetch failed:', roleError);
        // Continue without roles rather than failing completely
      }

      const userWithRoles: UserWithRoles = {
        ...userData,
        roles: roleData?.map(role => ({
          id: role.roles.id,
          name: role.roles.name,
          assigned_at: role.assigned_at,
          is_system_role: role.roles.is_system_role
        })) || []
      };

      return { success: true, data: userWithRoles };
    } catch (error) {
      console.error('Get user error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch user' 
      };
    }
  }

  async getUsers(options: UserSearchOptions): Promise<UserSearchResult> {
    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          tenant_id,
          email,
          first_name,
          last_name,
          status,
          email_verified_at,
          last_login_at,
          failed_login_attempts,
          locked_until,
          created_at,
          updated_at
        `, { count: 'exact' })
        .eq('tenant_id', options.tenantId);

      if (options.search) {
        query = query.or(`email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`);
      }

      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data: users, error: usersError, count } = await query.order('created_at', { ascending: false });

      if (usersError) {
        console.error('Users fetch failed:', usersError);
        return { success: false, error: usersError.message };
      }

      // Fetch roles for all users
      if (users && users.length > 0) {
        const userIds = users.map(u => u.id);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            assigned_at,
            roles!inner(
              id,
              name,
              is_system_role
            )
          `)
          .eq('tenant_id', options.tenantId)
          .in('user_id', userIds);

        // Map roles to users
        const usersWithRoles: UserWithRoles[] = users.map(user => ({
          ...user,
          roles: roleData?.filter(role => role.user_id === user.id).map(role => ({
            id: role.roles.id,
            name: role.roles.name,
            assigned_at: role.assigned_at,
            is_system_role: role.roles.is_system_role
          })) || []
        }));

        return { 
          success: true, 
          data: usersWithRoles, 
          total: count || 0 
        };
      }

      return { success: true, data: [], total: 0 };
    } catch (error) {
      console.error('Get users error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch users' 
      };
    }
  }

  async assignRole(userId: string, roleId: string, tenantId: string, assignedBy: string): Promise<ServiceResult> {
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
        console.error('Role assignment failed:', error);
        await standardizedAuditLogger.logStandardizedEvent(
          'user.role.assign.failed',
          'user_roles',
          userId,
          'failure',
          { userId: assignedBy, tenantId },
          { before: null, after: { targetUserId: userId } }
        );
        return { success: false, error: error.message };
      }

      await standardizedAuditLogger.logStandardizedEvent(
        'user.role.assign.success',
        'user_roles',
        userId,
        'success',
        { userId: assignedBy, tenantId },
        { before: null, after: { targetUserId: userId } }
      );

      return { success: true, message: 'Role assigned successfully' };
    } catch (error) {
      console.error('Role assignment error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to assign role' 
      };
    }
  }

  async removeRole(userId: string, roleId: string, tenantId: string, removedBy: string): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Role removal failed:', error);
        return { success: false, error: error.message };
      }

      await standardizedAuditLogger.logStandardizedEvent(
        'user.role.remove.success',
        'user_roles',
        userId,
        'success',
        { userId: removedBy, tenantId },
        { before: null, after: { targetUserId: userId } }
      );

      return { success: true, message: 'Role removed successfully' };
    } catch (error) {
      console.error('Role removal error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove role' 
      };
    }
  }
}

export const userManagementService = new UserManagementService();
