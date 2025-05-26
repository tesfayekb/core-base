
import { supabase } from '@/integrations/supabase/client';
import { standardizedAuditLogger } from '@/services/audit/StandardizedAuditLogger';

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
  roles?: Array<{
    id: string;
    name: string;
    assigned_at: string;
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
  status?: 'active' | 'inactive' | 'suspended' | 'pending_verification';
}

export interface UserSearchFilters {
  search?: string;
  status?: string;
  roleId?: string;
  page?: number;
  limit?: number;
}

export interface UserSearchResult {
  users: UserWithRoles[];
  total: number;
  page: number;
  limit: number;
}

class UserManagementService {
  
  // Get users with optional filtering
  async getUsers(tenantId: string, filters: UserSearchFilters = {}): Promise<UserSearchResult> {
    try {
      const { search, status, roleId, page = 1, limit = 50 } = filters;
      const offset = (page - 1) * limit;

      let query = supabase
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
          email_verified_at
        `)
        .eq('tenant_id', tenantId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Apply filters
      if (search) {
        query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: users, error, count } = await query;

      if (error) throw error;

      // Get roles for users if needed
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        (users || []).map(async (user) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select(`
              assigned_at,
              role:roles(id, name)
            `)
            .eq('user_id', user.id)
            .eq('tenant_id', tenantId);

          const roles = roleData?.map(r => ({
            id: (r.role as any)?.id,
            name: (r.role as any)?.name,
            assigned_at: r.assigned_at
          })).filter(r => r.id && r.name) || [];

          return {
            ...user,
            roles
          };
        })
      );

      // Filter by role if specified
      let filteredUsers = usersWithRoles;
      if (roleId) {
        filteredUsers = usersWithRoles.filter(user => 
          user.roles?.some(role => role.id === roleId)
        );
      }

      return {
        users: filteredUsers,
        total: count || 0,
        page,
        limit
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async createUser(request: CreateUserRequest, createdBy: string): Promise<{ success: boolean; user?: UserWithRoles; error?: string }> {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', request.email)
        .eq('tenant_id', request.tenantId)
        .single();

      if (existingUser) {
        await standardizedAuditLogger.logStandardizedEvent(
          'user.create',
          'user',
          null,
          'failure',
          { userId: createdBy, tenantId: request.tenantId },
          { before: null, after: { email: request.email, error: 'User already exists' } }
        );
        return { success: false, error: 'User with this email already exists' };
      }

      // Create user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          tenant_id: request.tenantId,
          password_hash: 'temp_hash', // This should be handled by proper auth flow
          status: 'pending_verification'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Assign roles if provided
      if (request.roleIds && request.roleIds.length > 0) {
        const roleAssignments = request.roleIds.map(roleId => ({
          user_id: newUser.id,
          role_id: roleId,
          tenant_id: request.tenantId,
          assigned_by: createdBy
        }));

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(roleAssignments);

        if (roleError) {
          console.error('Error assigning roles:', roleError);
        }
      }

      // Log successful creation
      await standardizedAuditLogger.logStandardizedEvent(
        'user.create',
        'user',
        newUser.id,
        'success',
        { userId: createdBy, tenantId: request.tenantId },
        { before: null, after: { email: request.email, userId: newUser.id } }
      );

      // Get user with roles
      const userWithRoles = await this.getUserById(newUser.id, request.tenantId);
      
      return { success: true, user: userWithRoles || undefined };
    } catch (error) {
      console.error('Error creating user:', error);
      
      await standardizedAuditLogger.logStandardizedEvent(
        'user.create',
        'user',
        null,
        'failure',
        { userId: createdBy, tenantId: request.tenantId },
        { before: null, after: { email: request.email, error: error instanceof Error ? error.message : 'Unknown error' } }
      );
      
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create user' };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<{ success: boolean; user?: UserWithRoles; error?: string }> {
    try {
      // Get current user data
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Update user
      const { data: updatedUser, error: updateError } = await supabase
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

      if (updateError) throw updateError;

      // Log successful update
      await standardizedAuditLogger.logStandardizedEvent(
        'user.update',
        'user',
        userId,
        'success',
        { userId: updatedBy, tenantId: currentUser.tenant_id },
        { before: currentUser, after: { ...updatedUser, updatedFields: Object.keys(request) } }
      );

      // Get user with roles
      const userWithRoles = await this.getUserById(userId, currentUser.tenant_id);
      
      return { success: true, user: userWithRoles || undefined };
    } catch (error) {
      console.error('Error updating user:', error);
      
      await standardizedAuditLogger.logStandardizedEvent(
        'user.update',
        'user',
        userId,
        'failure',
        { userId: updatedBy },
        { before: null, after: { error: error instanceof Error ? error.message : 'Unknown error' } }
      );
      
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update user' };
    }
  }

  async deleteUser(userId: string, deletedBy: string, hardDelete: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user data
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      if (hardDelete) {
        // Hard delete - remove from database
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (deleteError) throw deleteError;
      } else {
        // Soft delete - update status
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      // Log successful deletion
      await standardizedAuditLogger.logStandardizedEvent(
        'user.delete',
        'user',
        userId,
        'success',
        { userId: deletedBy, tenantId: currentUser.tenant_id },
        { before: currentUser, after: { deletionType: hardDelete ? 'hard' : 'soft' } }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      
      await standardizedAuditLogger.logStandardizedEvent(
        'user.delete',
        'user',
        userId,
        'failure',
        { userId: deletedBy },
        { before: null, after: { error: error instanceof Error ? error.message : 'Unknown error' } }
      );
      
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete user' };
    }
  }

  async getUserById(userId: string, tenantId: string): Promise<UserWithRoles | null> {
    try {
      const { data: user, error } = await supabase
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
          email_verified_at
        `)
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      // Get user roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select(`
          assigned_at,
          role:roles(id, name)
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      const roles = roleData?.map(r => ({
        id: (r.role as any).id,
        name: (r.role as any).name,
        assigned_at: r.assigned_at
      })) || [];

      return {
        ...user,
        roles
      };
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  async assignRole(userId: string, roleId: string, tenantId: string, assignedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if role assignment already exists
      const { data: existingAssignment } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId)
        .single();

      if (existingAssignment) {
        return { success: false, error: 'Role already assigned to user' };
      }

      // Assign role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          tenant_id: tenantId,
          assigned_by: assignedBy
        });

      if (error) throw error;

      // Log successful role assignment
      await standardizedAuditLogger.logStandardizedEvent(
        'user.role.assign',
        'user_role',
        userId,
        'success',
        { userId: assignedBy, tenantId },
        { before: null, after: { targetUserId: userId, roleId } }
      );

      return { success: true };
    } catch (error) {
      console.error('Error assigning role:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to assign role' };
    }
  }

  async removeRole(userId: string, roleId: string, tenantId: string, removedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Log successful role removal
      await standardizedAuditLogger.logStandardizedEvent(
        'user.role.remove',
        'user_role',
        userId,
        'success',
        { userId: removedBy, tenantId },
        { before: { targetUserId: userId, roleId }, after: null }
      );

      return { success: true };
    } catch (error) {
      console.error('Error removing role:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to remove role' };
    }
  }
}

export const userManagementService = new UserManagementService();
