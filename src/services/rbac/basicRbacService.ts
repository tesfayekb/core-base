
import { Role, Permission } from '../../types/rbac';
import { rbacService } from './rbacService';

export class BasicRBACService {
  
  /**
   * Check if user has permission
   */
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    return rbacService.checkPermission(userId, action, resource, resourceId);
  }
  
  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    return rbacService.getUserRoles(userId);
  }
  
  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string
  ): Promise<{ success: boolean; error?: string }> {
    return rbacService.assignRole(userId, roleId);
  }
  
  /**
   * Get effective permissions for user
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    return rbacService.getUserPermissions(userId);
  }
}

// Export singleton instance
export const basicRbacService = new BasicRBACService();
