
import { supabase } from '@/integrations/supabase/client';
import { standardizedAuditLogger } from '@/services/audit/StandardizedAuditLogger';

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

export interface UserWithRoles {
  id: string;
  tenant_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  email_verified_at?: string;
  last_login_at?: string;
  failed_login_attempts?: number;
  created_at: string;
  updated_at: string;
  roles?: Array<{
    id: string;
    name: string;
    assigned_at: string;
  }>;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class UserManagementService {
  async createUser(request: CreateUserRequest, currentUserId: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      // Generate a temporary password (in production, this would be sent via email)
      const tempPassword = this.generateTempPassword();
      
      // Create user in auth.users via RPC call
      const { data: authUser, error: authError } = await supabase.rpc('create_user_with_tenant', {
        p_email: request.email,
        p_password: tempPassword,
        p_tenant_id: request.tenantId,
        p_first_name: request.firstName || null,
        p_last_name: request.lastName || null
      });

      if (authError) {
        await standardizedAuditLogger.logStandardizedEvent(
          'user.create.failed',
          'user',
          'unknown',
          'failure',
          {
            userId: currentUserId,
            tenantId: request.tenantId
          },
          { error: authError.message, email: request.email }
        );
        return { success: false, error: authError.message };
      }

      // Get the created user with roles
      const userResult = await this.getUserById(authUser.id, request.tenantId);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'Failed to retrieve created user' };
      }

      // Assign roles if provided
      if (request.roleIds && request.roleIds.length > 0) {
        for (const roleId of request.roleIds) {
          await this.assignRoleToUser(authUser.id, roleId, request.tenantId, currentUserId);
        }
      }

      // Log successful creation
      await standardizedAuditLogger.logStandardizedEvent(
        'user.create.success',
        'user',
        authUser.id,
        'success',
        {
          userId: currentUserId,
          tenantId: request.tenantId
        },
        { 
          email: request.email,
          firstName: request.firstName,
          lastName: request.lastName,
          rolesAssigned: request.roleIds?.length || 0
        }
      );

      return { success: true, data: userResult.data };
    } catch (error) {
      console.error('User creation error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, currentUserId: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      // Get current user to determine tenant
      const currentUserResult = await this.getUserById(userId);
      if (!currentUserResult.success || !currentUserResult.data) {
        return { success: false, error: 'User not found' };
      }

      const tenantId = currentUserResult.data.tenant_id;

      // Update user in database
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          first_name: request.firstName,
          last_name: request.lastName,
          status: request.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        await standardizedAuditLogger.logStandardizedEvent(
          'user.update.failed',
          'user',
          userId,
          'failure',
          {
            userId: currentUserId,
            tenantId: tenantId
          },
          { error: error.message }
        );
        return { success: false, error: error.message };
      }

      // Get updated user with roles
      const userResult = await this.getUserById(userId, tenantId);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'Failed to retrieve updated user' };
      }

      // Log successful update
      await standardizedAuditLogger.logStandardizedEvent(
        'user.update.success',
        'user',
        userId,
        'success',
        {
          userId: currentUserId,
          tenantId: tenantId
        },
        { 
          updatedFields: Object.keys(request),
          newStatus: request.status
        }
      );

      return { success: true, data: userResult.data };
    } catch (error) {
      console.error('User update error:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  async deleteUser(userId: string, currentUserId: string): Promise<ServiceResult<void>> {
    try {
      // Get current user to determine tenant
      const currentUserResult = await this.getUserById(userId);
      if (!currentUserResult.success || !currentUserResult.data) {
        return { success: false, error: 'User not found' };
      }

      const tenantId = currentUserResult.data.tenant_id;

      // Soft delete - update status to inactive
      const { error } = await supabase
        .from('users')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('tenant_id', tenantId);

      if (error) {
        await standardizedAuditLogger.logStandardizedEvent(
          'user.delete.failed',
          'user',
          userId,
          'failure',
          {
            userId: currentUserId,
            tenantId: tenantId
          },
          { error: error.message }
        );
        return { success: false, error: error.message };
      }

      // Log successful deletion
      await standardizedAuditLogger.logStandardizedEvent(
        'user.delete.success',
        'user',
        userId,
        'success',
        {
          userId: currentUserId,
          tenantId: tenantId
        },
        { 
          deletionType: 'soft_delete',
          userEmail: currentUserResult.data.email
        }
      );

      return { success: true };
    } catch (error) {
      console.error('User deletion error:', error);
      return { success: false, error: 'Failed to delete user' };
    }
  }

  async getUserById(userId: string, tenantId?: string): Promise<ServiceResult<UserWithRoles>> {
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
          created_at,
          updated_at
        `)
        .eq('id', userId);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: user, error } = await query.single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Get user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select(`
          assigned_at,
          roles!inner(
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', user.tenant_id);

      const userWithRoles: UserWithRoles = {
        ...user,
        roles: roles?.map(ur => ({
          id: ur.roles.id,
          name: ur.roles.name,
          assigned_at: ur.assigned_at
        })) || []
      };

      return { success: true, data: userWithRoles };
    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, error: 'Failed to retrieve user' };
    }
  }

  async getUsersByTenant(tenantId: string, options?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ServiceResult<{ users: UserWithRoles[]; total: number }>> {
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
          created_at,
          updated_at
        `, { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Apply filters
      if (options?.search) {
        query = query.or(`email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      query = query.order('created_at', { ascending: false });

      const { data: users, error, count } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      // Get roles for all users
      const userIds = users?.map(u => u.id) || [];
      const { data: allRoles } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          assigned_at,
          roles!inner(
            id,
            name
          )
        `)
        .in('user_id', userIds)
        .eq('tenant_id', tenantId);

      const usersWithRoles: UserWithRoles[] = users?.map(user => ({
        ...user,
        roles: allRoles
          ?.filter(ur => ur.user_id === user.id)
          ?.map(ur => ({
            id: ur.roles.id,
            name: ur.roles.name,
            assigned_at: ur.assigned_at
          })) || []
      })) || [];

      return { 
        success: true, 
        data: { 
          users: usersWithRoles, 
          total: count || 0 
        } 
      };
    } catch (error) {
      console.error('Get users by tenant error:', error);
      return { success: false, error: 'Failed to retrieve users' };
    }
  }

  async assignRoleToUser(userId: string, roleId: string, tenantId: string, assignedBy: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString()
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Log role assignment
      await standardizedAuditLogger.logStandardizedEvent(
        'user.role.assigned',
        'user_role',
        `${userId}-${roleId}`,
        'success',
        {
          userId: assignedBy,
          tenantId: tenantId
        },
        { 
          targetUserId: userId,
          roleId: roleId
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Assign role error:', error);
      return { success: false, error: 'Failed to assign role' };
    }
  }

  async removeRoleFromUser(userId: string, roleId: string, tenantId: string, removedBy: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Log role removal
      await standardizedAuditLogger.logStandardizedEvent(
        'user.role.removed',
        'user_role',
        `${userId}-${roleId}`,
        'success',
        {
          userId: removedBy,
          tenantId: tenantId
        },
        { 
          targetUserId: userId,
          roleId: roleId
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Remove role error:', error);
      return { success: false, error: 'Failed to remove role' };
    }
  }

  private generateTempPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

export const userManagementService = new UserManagementService();
