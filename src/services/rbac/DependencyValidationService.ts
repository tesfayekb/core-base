
import { rbacService } from './rbacService';
import { PermissionContext, PermissionCheckOptions } from './rbacService';

export interface ValidationResult {
  valid: boolean;
  missingDependencies: string[];
  warnings: string[];
  requiredPermissions?: string[];
  assignerCapabilities?: string[];
  missingPermissions?: string[];
}

export interface PreValidationResult {
  canProceed: boolean;
  blockingIssues: string[];
  warnings: string[];
}

export class DependencyValidationService {
  private static instance: DependencyValidationService;

  static getInstance(): DependencyValidationService {
    if (!DependencyValidationService.instance) {
      DependencyValidationService.instance = new DependencyValidationService();
    }
    return DependencyValidationService.instance;
  }

  async validateRoleAssignment(
    assignerId: string,
    roleId: string,
    targetUserId: string,
    tenantId: string
  ): Promise<ValidationResult> {
    try {
      const userPermissions = await rbacService.getUserPermissions(assignerId, tenantId);
      
      if (userPermissions.length === 0) {
        return {
          valid: false,
          missingDependencies: ['ROLE_NOT_FOUND'],
          warnings: ['Role has no permissions or does not exist']
        };
      }

      // Check if user has admin privileges
      const hasAdminRole = userPermissions.some(p => 
        p.resource === 'users' && p.action === 'manage'
      );

      if (hasAdminRole) {
        return {
          valid: true,
          missingDependencies: [],
          warnings: ['Role contains high-privilege permissions: users:manage, roles:manage, permissions:manage, tenants:manage, settings:manage']
        };
      }

      return {
        valid: false,
        missingDependencies: ['users:view', 'roles:view'],
        warnings: []
      };
    } catch (error) {
      return {
        valid: false,
        missingDependencies: ['VALIDATION_ERROR'],
        warnings: [`Validation failed: ${error.message}`]
      };
    }
  }

  async validatePermissionAssignment(
    userId: string,
    permission: string,
    tenantId: string
  ): Promise<ValidationResult> {
    const userPermissions = await rbacService.getUserPermissions(userId, tenantId);
    const [resource, action] = permission.split(':');
    
    const hasPermission = userPermissions.some(p => 
      p.resource === resource && p.action === action
    );

    if (hasPermission) {
      return {
        valid: true,
        missingDependencies: [],
        warnings: [],
        requiredPermissions: [permission, `${resource}:view`],
        assignerCapabilities: [`${action}:${resource}`]
      };
    }

    return {
      valid: false,
      missingDependencies: [`${resource}:view`],
      warnings: [],
      missingPermissions: [`${resource}:view`],
      assignerCapabilities: [`${action}:${resource}`]
    };
  }

  async preValidateRoleAssignment(
    assignerId: string,
    roleId: string,
    targetUserId: string,
    tenantId: string
  ): Promise<PreValidationResult> {
    const userPermissions = await rbacService.getUserPermissions(assignerId, tenantId);
    
    if (userPermissions.length === 0) {
      return {
        canProceed: false,
        blockingIssues: ['Missing required permissions: users:manage'],
        warnings: []
      };
    }

    const hasRequiredPermissions = userPermissions.some(p => 
      p.resource === 'users' && ['manage', 'view'].includes(p.action)
    );

    if (hasRequiredPermissions) {
      return {
        canProceed: true,
        blockingIssues: [],
        warnings: []
      };
    }

    return {
      canProceed: false,
      blockingIssues: ['Missing required permissions: users:manage'],
      warnings: []
    };
  }
}
