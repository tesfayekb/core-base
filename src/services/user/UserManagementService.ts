
import { supabase } from '@/integrations/supabase/client';

export interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  roles?: Array<{
    id: string;
    name: string;
    description?: string;
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

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export class UserManagementService {
  private static instance: UserManagementService;

  static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  async createUser(request: CreateUserRequest, createdBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        return {
          success: false,
          error: 'Please provide a valid email address'
        };
      }

      // Create user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: request.email,
          first_name: request.firstName,
          last_name: request.lastName,
          tenant_id: request.tenantId,
          status: 'active'
        })
        .select()
        .single();

      if (userError) {
        return {
          success: false,
          error: userError.message
        };
      }

      return {
        success: true,
        data: userData as UserWithRoles
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<ServiceResult<UserWithRoles>> {
    try {
      const { data, error } = await supabase
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

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data as UserWithRoles
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      };
    }
  }

  async getUsersByTenant(tenantId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResult<UserWithRoles>> {
    try {
      const offset = (page - 1) * pageSize;

      // Get users with count
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw error;
      }

      return {
        data: data as UserWithRoles[],
        totalCount: count || 0,
        page,
        pageSize
      };
    } catch (error) {
      console.error('Failed to get users by tenant:', error);
      return {
        data: [],
        totalCount: 0,
        page,
        pageSize
      };
    }
  }
}

export const userManagementService = UserManagementService.getInstance();
