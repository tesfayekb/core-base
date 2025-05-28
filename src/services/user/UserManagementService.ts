import { auditLogger } from '../audit/AuditLogger';
import { supabase } from '../database/connection';

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
      // Log key parameters for audit/monitoring
      await auditLogger.logEvent({
        eventType: 'data_access',
        action: 'users.list',
        resourceType: 'users',
        tenantId,
        details: { page, pageSize }
      });
      
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }
      
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      // Get users associated with this tenant through user_tenants
      // First get count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from('user_tenants')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (countError) {
        await auditLogger.logEvent({
          eventType: 'error',
          action: 'users.count',
          resourceType: 'users',
          tenantId,
          details: { error: countError }
        });
        throw countError;
      }

      // Total count retrieved successfully - continue with user data retrieval

      // Now get the actual user data with joins
      // Use a simpler query to avoid relationship ambiguity
      const { data: userTenantData, error: usersError } = await supabase
        .from('user_tenants')
        .select(`
          user_id,
          users:users(id, email, first_name, last_name, status, created_at, last_login_at, failed_login_attempts, email_verified_at)
        `)
        .eq('tenant_id', tenantId)
        .range(start, end)
        .order('joined_at', { ascending: false });

      if (usersError) {
        await auditLogger.logEvent({
          eventType: 'error',
          action: 'users.fetch',
          resourceType: 'users',
          tenantId,
          details: { error: usersError, range: { start, end } }
        });
        throw usersError;
      }

      // User data successfully retrieved from database

      // Transform the data to match our interface
      const transformedUsers: UserWithRoles[] = (userTenantData || [])
        .filter((ut: any) => ut.users) // Filter out any entries where users is null
        .map((ut: any) => {
          const user = ut.users;
          return {
            id: user.id || ut.user_id, // Fallback to user_id from user_tenants
            email: user.email || 'user@example.com', // Fallback value
            first_name: user.first_name || 'User', // Fallback value
            last_name: user.last_name || '', // Fallback value
            status: user.status || 'pending_setup', // Fallback value
            created_at: user.created_at || new Date().toISOString(),
            last_login_at: user.last_login_at,
            failed_login_attempts: user.failed_login_attempts || 0,
            email_verified_at: user.email_verified_at,
            // Since we no longer query for roles, provide an empty array
            roles: []
          };
        });
        
      // If we have users but no roles, we'll fetch roles separately
      if (transformedUsers.length > 0) {
        try {
          // Get all user IDs
          const userIds = transformedUsers.map(user => user.id);
          
          // Fetch roles for these users
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select(`
              id,
              user_id,
              role_id,
              assigned_at,
              assigned_by,
              roles:roles(id, name, description, is_system_role)
            `)
            .in('user_id', userIds)
            .eq('tenant_id', tenantId);
            
          if (!roleError && roleData) {
            // Map roles to users
            for (const userRole of roleData) {
              const user = transformedUsers.find(u => u.id === userRole.user_id);
              if (user) {
                // Create role object with proper type handling
                const roleData = userRole.roles as any;
                const role = {
                  id: userRole.id,
                  role_id: userRole.role_id,
                  role: {
                    id: roleData ? roleData.id : 'unknown',
                    name: roleData ? roleData.name : 'Unknown Role',
                    description: roleData ? roleData.description : '',
                    is_system_role: roleData ? roleData.is_system_role : false
                  },
                  assigned_at: userRole.assigned_at,
                  assigned_by: userRole.assigned_by
                };
                
                // Add to user's roles
                user.roles.push(role);
              }
            }
          } else if (roleError) {
            await auditLogger.logEvent({
              eventType: 'warning',
              action: 'users.roles.fetch',
              resourceType: 'roles',
              tenantId,
              details: { error: roleError }
            });
          }
        } catch (error) {
          await auditLogger.logEvent({
            eventType: 'warning',
            action: 'users.roles.process',
            resourceType: 'roles',
            tenantId,
            details: { error }
          });
        }
      }

      // Log success for audit trail
      await auditLogger.logEvent({
        eventType: 'data_access',
        action: 'users.list',
        resourceType: 'users',
        tenantId,
        details: { count: transformedUsers.length, page, pageSize }
      });

      return {
        data: transformedUsers,
        total: totalCount || 0,
        page,
        pageSize
      };
    } catch (error) {
      await auditLogger.logEvent({
        eventType: 'error',
        action: 'users.list',
        resourceType: 'users',
        tenantId,
        details: { error }
      });
      throw error;
    }
  }

  async getUser(userId: string, tenantId: string): Promise<UserWithRoles | null> {
    try {
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
          email_verified_at,
          user_roles (
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
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      if (!users) {
        return null;
      }

      // Transform the data to match our interface
      const transformedUser: UserWithRoles = {
        id: users.id,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
        status: users.status,
        created_at: users.created_at,
        last_login_at: users.last_login_at,
        failed_login_attempts: users.failed_login_attempts,
        email_verified_at: users.email_verified_at,
        roles: (users.user_roles || []).map((userRole: any) => ({
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
      };

      return transformedUser;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
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
export { UserManagementService };
