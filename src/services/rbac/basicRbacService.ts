
import { rbacService } from './rbacService';
import { PermissionContext } from './EnhancedPermissionResolver';

export class BasicRBACService {
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    entityId?: string,
    tenantId?: string
  ): Promise<boolean> {
    const context: PermissionContext = {
      tenantId,
      entityId
    };
    
    return rbacService.checkPermission(userId, action, resource, context);
  }

  async getUserRoles(userId: string, tenantId?: string) {
    return rbacService.getUserRoles(userId, tenantId);
  }

  async validateEntityBoundary(
    userId: string,
    tenantId: string,
    action: string
  ): Promise<boolean> {
    const context: PermissionContext = { tenantId };
    return rbacService.checkPermission(userId, action, 'tenant', context);
  }

  async assignRole(
    assignerId: string,
    assigneeId: string,
    roleId: string,
    tenantId: string
  ) {
    return rbacService.assignRole(assignerId, assigneeId, roleId, tenantId);
  }

  async getUserPermissions(userId: string, tenantId?: string) {
    return rbacService.getUserPermissions(userId, tenantId);
  }
}
