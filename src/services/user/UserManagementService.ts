import { supabase } from '@/integrations/supabase/client';
import { auditLogger } from '@/services/audit/AuditLogger';

export interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  created_at: string;
  tenant_id: string;
  last_login_at?: string;
  failed_login_attempts?: number;
  email_verified_at?: string;
  roles?: {
    id: string;
    name: string;
    assigned_at: string;
    is_system_role?: boolean;
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
  status?: string;
}

export interface UserSearchFilters {
  tenantId: string;
  search?: string;
  status?: string;
  limit?: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const logAuditEvent = async (
  event: string,
  source: string,
  entityId: string | null,
  tenantId: string,
  userId: string | null,
  details: Record<string, any>
) => {
  try {
    await auditLogger.logEvent({
      event,
      source,
      entityId,
      tenantId,
      userId,
      details,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

class UserManagementService {
  async getUsers(filters: UserSearchFilters): Promise<ServiceResponse<UserWithRoles[]>> {
    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          status,
          created_at,
          tenant_id,
          last_login_at,
          failed_login_attempts,
          email_verified_at
        `)
        .eq('tenant_id', filters.tenantId);

      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data: users, error } = await query;

      if (error) {
        await logAuditEvent('user_search_failed', 'users', null, filters.tenantId, null, {
          error: error.message,
          filters
        });
        throw error;
      }

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (users || []).map(async (user) => {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select(`
              roles (
                id,
                name,
                is_system_role
              ),
              assigned_at
            `)
            .eq('user_id', user.id)
            .eq('tenant_id', filters.tenantId);

          const roles = userRoles?.map(ur => ({
            id: ur.roles.id,
            name: ur.roles.name,
            assigned_at: ur.assigned_at,
            is_system_role: ur.roles.is_system_role
          })) || [];

          return {
            ...user,
            roles
          };
        })
      );

      await logAuditEvent('user_search', 'users', null, filters.tenantId, null, {
        filters,
        result_count: usersWithRoles.length
      });

      return {
        success: true,
        data: usersWithRoles
      };
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      };
    }
  }

  async createUser(request: CreateUserRequest): Promise<ServiceResponse<UserWithRoles>> {
    try {
      // Create user
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          tenant_id: request.tenantId,
          password_hash: 'temp_hash', // This would be handled by auth system
          status: 'pending_verification'
        })
        .select()
        .single();

      if (userError) throw userError;

      // Assign roles if provided
      if (request.roleIds && request.roleIds.length > 0) {
        const roleAssignments = request.roleIds.map(roleId => ({
          user_id: user.id,
          role_id: roleId,
          tenant_id: request.tenantId
        }));

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(roleAssignments);

        if (roleError) throw roleError;
      }

      await logAuditEvent('user_created', 'users', user.id, request.tenantId, null, {
        email: request.email,
        roles: request.roleIds
      });

      return {
        success: true,
        data: { ...user, roles: [] }
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest): Promise<ServiceResponse<UserWithRoles>> {
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

      await logAuditEvent('user_updated', 'users', userId, user.tenant_id, null, {
        changes: request
      });

      return {
        success: true,
        data: { ...user, roles: [] }
      };
    } catch (error) {
      console.error('Failed to update user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      };
    }
  }

  async assignRole(userId: string, roleId: string, tenantId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId
        });

      if (error) throw error;

      await logAuditEvent('role_assigned', 'user_roles', null, tenantId, null, {
        user_id: userId,
        role_id: roleId
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to assign role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign role'
      };
    }
  }

  async removeRole(userId: string, roleId: string, tenantId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await logAuditEvent('role_removed', 'user_roles', null, tenantId, null, {
        user_id: userId,
        role_id: roleId
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

  async getUserWithRoles(userId: string, tenantId: string): Promise<ServiceResponse<UserWithRoles>> {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          status,
          created_at,
          tenant_id,
          last_login_at,
          failed_login_attempts,
          email_verified_at
        `)
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (userError) throw userError;

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          roles (
            id,
            name,
            is_system_role
          ),
          assigned_at
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      const roles = userRoles?.map(ur => ({
        id: ur.roles.id,
        name: ur.roles.name,
        assigned_at: ur.assigned_at,
        is_system_role: ur.roles.is_system_role
      })) || [];

      await logAuditEvent('user_retrieved', 'users', userId, tenantId, null, {});

      return {
        success: true,
        data: { ...user, roles }
      };
    } catch (error) {
      console.error('Failed to get user with roles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user'
      };
    }
  }
}

export const userManagementService = new UserManagementService();
