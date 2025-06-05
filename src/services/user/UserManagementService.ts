
import { supabase } from '@/services/database';
import { UserWithRoles, CreateUserRequest, UpdateUserRequest } from '@/types/user';

export class UserManagementService {
  /**
   * Get users with optional filtering, pagination, and tenant isolation
   */
  static async getUsers(options: {
    filters?: {
      search?: string;
      status?: string;
      role?: string;
      tenant?: string;
    };
    pagination?: {
      page?: number;
      limit?: number;
    };
    sorting?: {
      field?: string;
      direction?: 'asc' | 'desc';
    };
    tenantId?: string;
    isSystemAdmin?: boolean;
  } = {}): Promise<{ users: UserWithRoles[]; totalCount: number }> {
    const {
      filters = {},
      pagination = { page: 1, limit: 50 },
      sorting = { field: 'created_at', direction: 'desc' },
      tenantId,
      isSystemAdmin = false
    } = options;

    console.log('UserManagementService.getUsers called with:', {
      filters,
      pagination,
      isSystemAdmin,
      tenantId
    });

    try {
      if (isSystemAdmin) {
        console.log('Syncing all users from identity service...');
        const { data: syncResult, error: syncError } = await supabase.rpc('force_sync_all_users');
        if (syncError) {
          console.error('Sync error:', syncError);
        } else {
          console.log('Successfully synced users from identity service:', syncResult || 0);
        }
      }

      // Build the query with tenant information
      let query = supabase
        .from('users')
        .select(`
          *,
          tenant:tenants(
            id,
            name,
            slug
          ),
          user_roles:user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles:roles(
              id,
              name,
              description
            )
          )
        `, { count: 'exact' });

      // Apply tenant filtering (unless superadmin wants all users)
      if (!isSystemAdmin && tenantId) {
        console.log('Applying tenant filter:', tenantId);
        query = query.eq('tenant_id', tenantId);
      } else if (isSystemAdmin) {
        console.log('SystemAdmin access - fetching all users without tenant restrictions');
      } else {
        console.log('No tenant context - this might cause issues');
      }

      // Apply filters
      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply sorting
      if (sorting.field) {
        query = query.order(sorting.field, { ascending: sorting.direction === 'asc' });
      }

      // Apply pagination
      if (pagination.page && pagination.limit) {
        const start = (pagination.page - 1) * pagination.limit;
        const end = start + pagination.limit - 1;
        query = query.range(start, end);
      }

      console.log('Executing Supabase query...');
      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      console.log('Successfully fetched users:', data?.length || 0, 'total count:', count || 0);

      return {
        users: (data || []) as UserWithRoles[],
        totalCount: count || 0
      };
    } catch (error) {
      console.error('UserManagementService.getUsers error:', error);
      throw error;
    }
  }

  static async createUser(userData: CreateUserRequest): Promise<UserWithRoles> {
    try {
      if (!userData.email || !userData.email.includes('@')) {
        throw new Error('Valid email is required');
      }
      
      if (!userData.first_name?.trim()) {
        throw new Error('First name is required');
      }

      console.log('Creating user with data:', userData);

      try {
        const { data: authData, error: authError } = await supabase['auth']['admin']['createUser']({
          email: userData.email,
          email_confirm: true,
          user_metadata: { 
            first_name: userData.first_name,
            last_name: userData.last_name 
          }
        });

        if (authError) {
          console.warn('API failed:', authError);
          throw new Error('SERVICE_UNAVAILABLE');
        }

        const userId = authData.user.id;
        console.log('Successfully created user via API:', userId);

        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const { data: syncResult } = await supabase.rpc('manually_sync_user', { p_user_id: userId });
          console.log('Manual sync result:', syncResult);
        } catch (syncError) {
          console.warn('Sync function not available:', syncError);
        }

        if (userData.tenant_id) {
          await supabase.rpc('set_tenant_context', { tenant_id: userData.tenant_id });
          await supabase.rpc('set_user_context', { user_id: (await supabase['auth'].getUser()).data.user?.id });
        }

        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .update({
            tenant_id: userData.tenant_id,
            status: userData.status || 'active'
          })
          .eq('id', userId)
          .select(`
            *,
            user_roles:user_roles!user_roles_user_id_fkey(
              id,
              role_id,
              assigned_at,
              roles:roles(
                id,
                name,
                description
              )
            )
          `)
          .single();

        if (updateError) {
          console.error('Update user error after creation:', updateError);
          throw updateError;
        }

        return updateData as UserWithRoles;

      } catch (apiError) {
        console.log('API failed, falling back to direct database insertion');
        
        const userId = crypto.randomUUID();
        
        try {
          if (userData.tenant_id) {
            await supabase.rpc('set_tenant_context', { tenant_id: userData.tenant_id });
            await supabase.rpc('set_user_context', { user_id: (await supabase['auth'].getUser()).data.user?.id });
          }
        } catch (contextError) {
          console.warn('Context setting failed, continuing without context:', contextError);
        }

        // Insert directly into users table as fallback
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            tenant_id: userData.tenant_id,
            status: userData.status || 'active',
            credential_field: null
          })
          .select(`
            *,
            user_roles:user_roles!user_roles_user_id_fkey(
              id,
              role_id,
              assigned_at,
              roles:roles(
                id,
                name,
                description
              )
            )
          `)
          .single();

        if (insertError) {
          console.error('Direct insertion error:', insertError);
          throw new Error(`User creation failed: ${insertError.message}`);
        }

        console.log('Successfully created user via direct insertion:', insertData);
        return insertData as UserWithRoles;
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, userData: UpdateUserRequest): Promise<UserWithRoles> {
    try {
      const { data: currentUser } = await supabase['auth'].getUser();
      if (currentUser.user) {
        try {
          await supabase.rpc('set_user_context', { user_id: currentUser.user.id });
        } catch (contextError) {
          console.warn('Context setting failed:', contextError);
        }
      }

      console.log('Updating user:', userId, 'with data:', userData);

      try {
        const { data: syncResult } = await supabase.rpc('manually_sync_user', { p_user_id: userId });
        console.log('Pre-update sync result:', syncResult);
      } catch (syncError) {
        console.warn('Sync function not available or failed:', syncError);
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select(`
          *,
          user_roles:user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles:roles(
              id,
              name,
              description
            )
          )
        `)
        .single();

      if (error) {
        console.error('Update user error:', error);
        throw error;
      }

      console.log('Successfully updated user:', data);
      return data as UserWithRoles;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Delete user error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getUserById(userId: string): Promise<UserWithRoles | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles:user_roles!user_roles_user_id_fkey(
            id,
            role_id,
            assigned_at,
            roles:roles(
              id,
              name,
              description
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        console.error('Get user by ID error:', error);
        throw error;
      }

      return data as UserWithRoles;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  static async assignRoles(userId: string, roleIds: string[], tenantId: string): Promise<void> {
    try {
      // Remove existing roles for the user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting existing user roles:', deleteError);
        throw deleteError;
      }

      // Insert new roles for the user
      const newRoles = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_at: new Date().toISOString()
      }));

      const { data: insertData, error: insertError } = await supabase
        .from('user_roles')
        .insert(newRoles);

      if (insertError) {
        console.error('Error assigning new roles to user:', insertError);
        throw insertError;
      }

      console.log('Successfully assigned roles to user:', insertData);
    } catch (error) {
      console.error('Error assigning roles to user:', error);
      throw error;
    }
  }
}
