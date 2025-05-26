
import { supabase } from '@/integrations/supabase/client';
import { auditService } from '@/services/audit/AuditService';

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
    is_system_role?: boolean;
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

export interface UserSearchParams {
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

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class UserManagementService {
  async createUser(request: CreateUserRequest, createdBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          tenant_id: request.tenantId,
          password_hash: 'temp_hash', // This would be handled by proper auth flow
          status: 'pending_verification'
        })
        .select()
        .single();

      if (userError) throw userError;

      // Assign roles if provided
      if (request.roleIds && request.roleIds.length > 0) {
        const roleAssignments = request.roleIds.map(roleId => ({
          user_id: userData.id,
          role_id: roleId,
          tenant_id: request.tenantId,
          assigned_by: createdBy
        }));

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(roleAssignments);

        if (roleError) throw roleError;
      }

      // Log audit event
      await auditService.logEvent({
        event_type: 'data_modification',
        action: 'user_created',
        resource_type: 'user',
        resource_id: userData.id,
        details: {
          email: request.email,
          tenant_id: request.tenantId,
          roles_assigned: request.roleIds?.length || 0
        },
        user_id: createdBy,
        tenant_id: request.tenantId
      });

      // Fetch user with roles
      const userWithRoles = await this.getUserById(userData.id, request.tenantId);
      return userWithRoles;

    } catch (error) {
      console.error('Error creating user:', error);
      
      await auditService.logEvent({
        event_type: 'system_event',
        action: 'user_creation_failed',
        resource_type: 'user',
        details: {
          before: null,
          after: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        user_id: createdBy,
        tenant_id: request.tenantId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      // Get current user data for audit
      const currentUser = await this.getUserById(userId);
      if (!currentUser.success) {
        throw new Error('User not found');
      }

      // Update user
      const updateData: any = {};
      if (request.firstName !== undefined) updateData.first_name = request.firstName;
      if (request.lastName !== undefined) updateData.last_name = request.lastName;
      if (request.status !== undefined) updateData.status = request.status;

      const { data: userData, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log audit event
      await auditService.logEvent({
        event_type: 'data_modification',
        action: 'user_updated',
        resource_type: 'user',
        resource_id: userId,
        details: {
          before: currentUser.data,
          after: userData,
          updatedFields: Object.keys(updateData)
        },
        user_id: updatedBy,
        tenant_id: userData.tenant_id
      });

      // Fetch updated user with roles
      const userWithRoles = await this.getUserById(userId, userData.tenant_id);
      return userWithRoles;

    } catch (error) {
      console.error('Error updating user:', error);

      await auditService.logEvent({
        event_type: 'system_event',
        action: 'user_update_failed',
        resource_type: 'user',
        resource_id: userId,
        details: {
          before: null,
          after: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        user_id: updatedBy
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      };
    }
  }

  async deleteUser(userId: string, deletedBy: string, type: 'soft' | 'hard' = 'soft'): Promise<ServiceResult<boolean>> {
    try {
      // Get current user data for audit
      const currentUser = await this.getUserById(userId);
      if (!currentUser.success) {
        throw new Error('User not found');
      }

      if (type === 'soft') {
        // Soft delete - update status
        const { error } = await supabase
          .from('users')
          .update({ status: 'inactive' })
          .eq('id', userId);

        if (error) throw error;
      } else {
        // Hard delete
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) throw error;
      }

      // Log audit event
      await auditService.logEvent({
        event_type: 'data_modification',
        action: 'user_deleted',
        resource_type: 'user',
        resource_id: userId,
        details: {
          before: currentUser.data,
          after: null,
          deletionType: type
        },
        user_id: deletedBy,
        tenant_id: currentUser.data?.tenant_id
      });

      return { success: true, data: true };

    } catch (error) {
      console.error('Error deleting user:', error);

      await auditService.logEvent({
        event_type: 'system_event',
        action: 'user_deletion_failed',
        resource_type: 'user',
        resource_id: userId,
        details: {
          before: null,
          after: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        user_id: deletedBy
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user'
      };
    }
  }

  async getUserById(userId: string, tenantId?: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          user_roles!inner(
            assigned_at,
            roles!inner(
              id,
              name,
              is_system_role
            )
          )
        `)
        .eq('id', userId);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      // Transform the data to match our interface
      const userWithRoles: UserWithRoles = {
        ...data,
        roles: data.user_roles?.map((ur: any) => ({
          id: ur.roles.id,
          name: ur.roles.name,
          assigned_at: ur.assigned_at,
          is_system_role: ur.roles.is_system_role
        })) || []
      };

      return { success: true, data: userWithRoles };
    } catch (error) {
      console.error('Error fetching user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user'
      };
    }
  }

  async getUsers(params: UserSearchParams): Promise<UserSearchResult> {
    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          user_roles(
            assigned_at,
            roles(
              id,
              name,
              is_system_role
            )
          )
        `, { count: 'exact' })
        .eq('tenant_id', params.tenantId);

      // Apply search filter
      if (params.search) {
        query = query.or(`email.ilike.%${params.search}%,first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`);
      }

      // Apply status filter
      if (params.status) {
        query = query.eq('status', params.status);
      }

      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      const usersWithRoles: UserWithRoles[] = data?.map(user => ({
        ...user,
        roles: user.user_roles?.map((ur: any) => ({
          id: ur.roles.id,
          name: ur.roles.name,
          assigned_at: ur.assigned_at,
          is_system_role: ur.roles.is_system_role
        })) || []
      })) || [];

      return {
        success: true,
        data: usersWithRoles,
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      };
    }
  }

  async assignRole(userId: string, roleId: string, tenantId: string, assignedBy: string): Promise<ServiceResult<boolean>> {
    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId)
        .single();

      if (existing) {
        return { success: true, data: true }; // Already assigned
      }

      // Create role assignment
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_by: assignedBy
        });

      if (error) throw error;

      // Log audit event
      await auditService.logEvent({
        event_type: 'authorization',
        action: 'role_assigned',
        resource_type: 'user_role',
        resource_id: userId,
        details: {
          before: null,
          after: { role_id: roleId, tenant_id: tenantId },
          targetUserId: userId
        },
        user_id: assignedBy,
        tenant_id: tenantId
      });

      return { success: true, data: true };
    } catch (error) {
      console.error('Error assigning role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign role'
      };
    }
  }

  async unassignRole(userId: string, roleId: string, tenantId: string, unassignedBy: string): Promise<ServiceResult<boolean>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Log audit event
      await auditService.logEvent({
        event_type: 'authorization',
        action: 'role_unassigned',
        resource_type: 'user_role',
        resource_id: userId,
        details: {
          before: { role_id: roleId, tenant_id: tenantId },
          after: null,
          targetUserId: userId
        },
        user_id: unassignedBy,
        tenant_id: tenantId
      });

      return { success: true, data: true };
    } catch (error) {
      console.error('Error unassigning role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unassign role'
      };
    }
  }
}

export const userManagementService = new UserManagementService();
