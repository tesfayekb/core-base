
import { supabase } from '@/integrations/supabase/client';
import { UserManagementService } from './UserManagementService';
import { UserWithRoles } from '@/types/user';

export interface BulkOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: Array<{ userId: string; error: string }>;
}

export class BulkUserOperationsService {
  static async bulkUpdateStatus(
    userIds: string[],
    status: string,
    tenantId: string
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: true,
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        await UserManagementService.updateUser(userId, { status });
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.failureCount === 0;
    return result;
  }

  static async bulkDelete(
    userIds: string[],
    tenantId: string
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: true,
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        await UserManagementService.deleteUser(userId);
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.failureCount === 0;
    return result;
  }

  static async bulkAssignRole(
    userIds: string[],
    roleId: string,
    tenantId: string
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: true,
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        // Get current roles and add the new one
        const user = await UserManagementService.getUserById(userId);
        const currentRoleIds = user?.user_roles?.map(ur => ur.role_id) || [];
        const newRoleIds = [...new Set([...currentRoleIds, roleId])];
        
        await UserManagementService.assignRoles(userId, newRoleIds, tenantId);
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.failureCount === 0;
    return result;
  }
}
