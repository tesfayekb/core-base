
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/database';
import { standardizedAuditLogger } from '../audit/StandardizedAuditLogger';
import { enhancedPermissionResolver } from '../rbac/EnhancedPermissionResolver';

export interface CreateUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId: string;
  roleIds?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  metadata?: Record<string, any>;
}

export interface UserListFilter {
  tenantId?: string;
  status?: string;
  search?: string;
  roleId?: string;
  limit?: number;
  offset?: number;
}

export interface UserWithRoles extends User {
  roles?: Array<{
    id: string;
    name: string;
    assigned_at: string;
  }>;
}

export class UserManagementService {
  private static instance: UserManagementService;

  static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  async createUser(request: CreateUserRequest, createdBy: string): Promise<{ success: boolean; user?: UserWithRoles; error?: string }> {
    try {
      // Validate permissions
      const canCreate = await enhancedPermissionResolver.resolvePermission(
        createdBy,
        'create',
        'users',
        { tenantId: request.tenantId }
      );

      if (!canCreate.granted) {
        return { success: false, error: 'Permission denied to create users' };
      }

      // Create user record
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          tenant_id: request.tenantId,
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          password_hash: 'temp_hash', // In real implementation, this would be properly hashed
          metadata: request.metadata || {}
        })
        .select()
        .single();

      if (userError || !user) {
        return { success: false, error: userError?.message || 'Failed to create user' };
      }

      // Assign roles if provided
      if (request.roleIds && request.roleIds.length > 0) {
        await this.assignRoles(user.id, request.roleIds, request.tenantId, createdBy);
      }

      // Log audit event
      await standardizedAuditLogger.logStandardizedEvent(
        'user.created',
        'user',
        user.id,
        'success',
        {
          userId: createdBy,
          tenantId: request.tenantId,
          targetUser: user.email
        }
      );

      return { success: true, user: user as UserWithRoles };
    } catch (error) {
      console.error('User creation failed:', error);
      return { success: false, error: 'User creation failed' };
    }
  }

  async updateUser(userId: string, updates: UpdateUserRequest, updatedBy: string): Promise<{ success: boolean; user?: UserWithRoles; error?: string }> {
    try {
      // Get user's tenant context
      const { data: existingUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .single();

      if (!existingUser) {
        return { success: false, error: 'User not found' };
      }

      // Validate permissions
      const canUpdate = await enhancedPermissionResolver.resolvePermission(
        updatedBy,
        'update',
        'users',
        { tenantId: existingUser.tenant_id, resourceId: userId }
      );

      if (!canUpdate.granted) {
        return { success: false, error: 'Permission denied to update user' };
      }

      const { data: user, error } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          status: updates.status,
          metadata: updates.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('tenant_id', existingUser.tenant_id)
        .select()
        .single();

      if (error || !user) {
        return { success: false, error: error?.message || 'Failed to update user' };
      }

      // Log audit event
      await standardizedAuditLogger.logStandardizedEvent(
        'user.updated',
        'user',
        userId,
        'success',
        {
          userId: updatedBy,
          tenantId: existingUser.tenant_id,
          changes: updates
        }
      );

      return { success: true, user: user as UserWithRoles };
    } catch (error) {
      console.error('User update failed:', error);
      return { success: false, error: 'User update failed' };
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's tenant context
      const { data: existingUser } = await supabase
        .from('users')
        .select('tenant_id, email')
        .eq('id', userId)
        .single();

      if (!existingUser) {
        return { success: false, error: 'User not found' };
      }

      // Validate permissions
      const canDelete = await enhancedPermissionResolver.resolvePermission(
        deletedBy,
        'delete',
        'users',
        { tenantId: existingUser.tenant_id, resourceId: userId }
      );

      if (!canDelete.granted) {
        return { success: false, error: 'Permission denied to delete user' };
      }

      // Soft delete by updating status
      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('tenant_id', existingUser.tenant_id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Log audit event
      await standardizedAuditLogger.logStandardizedEvent(
        'user.deleted',
        'user',
        userId,
        'success',
        {
          userId: deletedBy,
          tenantId: existingUser.tenant_id,
          targetUser: existingUser.email
        }
      );

      return { success: true };
    } catch (error) {
      console.error('User deletion failed:', error);
      return { success: false, error: 'User deletion failed' };
    }
  }

  async getUsers(filter: UserListFilter): Promise<{ users: UserWithRoles[]; total: number }> {
    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          user_roles!inner(
            assigned_at,
            roles(id, name)
          )
        `, { count: 'exact' });

      if (filter.tenantId) {
        query = query.eq('tenant_id', filter.tenantId);
      }

      if (filter.status) {
        query = query.eq('status', filter.status);
      }

      if (filter.search) {
        query = query.or(`email.ilike.%${filter.search}%,first_name.ilike.%${filter.search}%,last_name.ilike.%${filter.search}%`);
      }

      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch users:', error);
        return { users: [], total: 0 };
      }

      const users = (data || []).map(user => ({
        ...user,
        roles: user.user_roles?.map((ur: any) => ({
          id: ur.roles.id,
          name: ur.roles.name,
          assigned_at: ur.assigned_at
        })) || []
      }));

      return { users, total: count || 0 };
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return { users: [], total: 0 };
    }
  }

  async getUser(userId: string, tenantId: string): Promise<UserWithRoles | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles(
            assigned_at,
            assigned_by,
            roles(id, name, description)
          )
        `)
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        ...data,
        roles: data.user_roles?.map((ur: any) => ({
          id: ur.roles.id,
          name: ur.roles.name,
          assigned_at: ur.assigned_at
        })) || []
      };
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  }

  private async assignRoles(userId: string, roleIds: string[], tenantId: string, assignedBy: string): Promise<void> {
    const roleAssignments = roleIds.map(roleId => ({
      user_id: userId,
      role_id: roleId,
      tenant_id: tenantId,
      assigned_by: assignedBy
    }));

    await supabase
      .from('user_roles')
      .insert(roleAssignments);
  }
}

export const userManagementService = UserManagementService.getInstance();
