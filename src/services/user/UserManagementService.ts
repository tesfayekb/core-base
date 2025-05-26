
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  metadata?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  assigned_at: string;
  is_system_role?: boolean;
}

export interface UserWithRoles extends User {
  roles?: Role[];
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

export interface CreateUserData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  tenant_id: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface StandardResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class UserManagementService {
  async getUsers(params: UserSearchParams): Promise<UserSearchResult> {
    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          user_roles!inner (
            assigned_at,
            roles!inner (
              id,
              name,
              is_system_role
            )
          )
        `)
        .eq('tenant_id', params.tenantId);

      if (params.search) {
        query = query.or(`email.ilike.%${params.search}%,first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`);
      }

      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return { success: false, error: error.message };
      }

      // Transform the data to include roles properly
      const usersWithRoles: UserWithRoles[] = (data || []).map((user: any) => ({
        ...user,
        roles: user.user_roles?.map((ur: any) => ({
          id: ur.roles.id,
          name: ur.roles.name,
          assigned_at: ur.assigned_at,
          is_system_role: ur.roles.is_system_role
        })) || []
      }));

      return {
        success: true,
        data: usersWithRoles,
        total: usersWithRoles.length
      };
    } catch (error) {
      console.error('Error in getUsers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createUser(userData: CreateUserData): Promise<StandardResult<User>> {
    try {
      console.log('Creating user with data:', userData);
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          password_hash: userData.password, // In production, this should be hashed
          first_name: userData.first_name,
          last_name: userData.last_name,
          tenant_id: userData.tenant_id,
          metadata: userData.metadata || {},
          status: 'pending_verification'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return { success: false, error: error.message };
      }

      // Log audit event with proper parameters
      await this.logAuditEvent('user_management', 'create_user', 'users', data.id, {
        email: userData.email,
        tenant_id: userData.tenant_id
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error in createUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  async updateUser(userId: string, updateData: UpdateUserData): Promise<StandardResult<User>> {
    try {
      console.log('Updating user:', userId, updateData);
      
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message };
      }

      // Log audit event with proper parameters
      await this.logAuditEvent('user_management', 'update_user', 'users', userId, {
        changes: updateData
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error in updateUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      };
    }
  }

  async deleteUser(userId: string): Promise<StandardResult> {
    try {
      console.log('Deleting user:', userId);
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: error.message };
      }

      // Log audit event with proper parameters
      await this.logAuditEvent('user_management', 'delete_user', 'users', userId, {
        deleted_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error in deleteUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user'
      };
    }
  }

  async getUserRoles(userId: string, tenantId: string): Promise<StandardResult<Role[]>> {
    try {
      console.log('Getting user roles for:', userId, tenantId);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          assigned_at,
          roles!inner (
            id,
            name,
            is_system_role
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return { success: false, error: error.message };
      }

      const roles: Role[] = (data || []).map((item: any) => ({
        id: item.roles.id,
        name: item.roles.name,
        assigned_at: item.assigned_at,
        is_system_role: item.roles.is_system_role
      }));

      return { success: true, data: roles };
    } catch (error) {
      console.error('Error in getUserRoles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user roles'
      };
    }
  }

  async assignRole(userId: string, roleId: string, tenantId: string): Promise<StandardResult> {
    try {
      console.log('Assigning role:', { userId, roleId, tenantId });
      
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error assigning role:', error);
        return { success: false, error: error.message };
      }

      // Log audit event with proper parameters
      await this.logAuditEvent('role_management', 'assign_role', 'user_roles', null, {
        user_id: userId,
        role_id: roleId,
        tenant_id: tenantId
      });

      return { success: true };
    } catch (error) {
      console.error('Error in assignRole:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign role'
      };
    }
  }

  async removeRole(userId: string, roleId: string, tenantId: string): Promise<StandardResult> {
    try {
      console.log('Removing role:', { userId, roleId, tenantId });
      
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error removing role:', error);
        return { success: false, error: error.message };
      }

      // Log audit event with proper parameters
      await this.logAuditEvent('role_management', 'remove_role', 'user_roles', null, {
        user_id: userId,
        role_id: roleId,
        tenant_id: tenantId
      });

      return { success: true };
    } catch (error) {
      console.error('Error in removeRole:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove role'
      };
    }
  }

  async getAvailableRoles(tenantId: string): Promise<StandardResult<Role[]>> {
    try {
      console.log('Getting available roles for tenant:', tenantId);
      
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, is_system_role')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching roles:', error);
        return { success: false, error: error.message };
      }

      const roles: Role[] = (data || []).map((role: any) => ({
        id: role.id,
        name: role.name,
        assigned_at: new Date().toISOString(), // Default for available roles
        is_system_role: role.is_system_role
      }));

      return { success: true, data: roles };
    } catch (error) {
      console.error('Error in getAvailableRoles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get available roles'
      };
    }
  }

  async getUserById(userId: string): Promise<StandardResult<UserWithRoles>> {
    try {
      console.log('Getting user by ID:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles (
            assigned_at,
            roles!inner (
              id,
              name,
              is_system_role
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return { success: false, error: error.message };
      }

      // Transform the data to include roles properly
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
      console.error('Error in getUserById:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user'
      };
    }
  }

  private async logAuditEvent(
    eventType: string,
    action: string,
    resourceType?: string,
    resourceId?: string | null,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.rpc('log_audit_event', {
        p_event_type: eventType,
        p_action: action,
        p_resource_type: resourceType || null,
        p_resource_id: resourceId || null,
        p_details: details || {}
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw here to avoid breaking the main operation
    }
  }
}

export const userManagementService = new UserManagementService();
