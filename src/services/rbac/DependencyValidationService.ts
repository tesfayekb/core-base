
// Dependency Validation Service for Role Assignment
// Validates permission dependencies when assigning roles

import { granularDependencyResolver } from './GranularDependencyResolver';
import { rbacService } from './rbacService';

export interface RoleAssignmentValidation {
  valid: boolean;
  missingDependencies: string[];
  dependencyChain: string[];
  warnings: string[];
}

export interface PermissionAssignmentValidation {
  valid: boolean;
  requiredPermissions: string[];
  missingPermissions: string[];
  assignerCapabilities: string[];
}

export class DependencyValidationService {
  private static instance: DependencyValidationService;

  static getInstance(): DependencyValidationService {
    if (!DependencyValidationService.instance) {
      DependencyValidationService.instance = new DependencyValidationService();
    }
    return DependencyValidationService.instance;
  }

  /**
   * Validate role assignment considering all permission dependencies
   */
  async validateRoleAssignment(
    assignerId: string,
    roleId: string,
    targetUserId: string,
    entityId: string
  ): Promise<RoleAssignmentValidation> {
    try {
      // Get role permissions
      const rolePermissions = await this.getRolePermissions(roleId, entityId);
      
      if (rolePermissions.length === 0) {
        return {
          valid: false,
          missingDependencies: ['ROLE_NOT_FOUND'],
          dependencyChain: [],
          warnings: ['Role has no permissions or does not exist']
        };
      }

      // Validate each permission and its dependencies
      const validationResults = await Promise.all(
        rolePermissions.map(permission => 
          this.validatePermissionAssignment(assignerId, permission, entityId)
        )
      );

      // Aggregate results
      const allMissingDependencies = validationResults.flatMap(result => result.missingPermissions);
      const allRequiredPermissions = validationResults.flatMap(result => result.requiredPermissions);
      const warnings: string[] = [];

      // Check for high-privilege permissions
      const highPrivilegePermissions = rolePermissions.filter(perm => 
        perm.includes('delete') || perm.includes('manage') || perm.includes('admin')
      );
      
      if (highPrivilegePermissions.length > 0) {
        warnings.push(`Role contains high-privilege permissions: ${highPrivilegePermissions.join(', ')}`);
      }

      // Check for cross-entity permissions
      const crossEntityPermissions = rolePermissions.filter(perm => 
        perm.includes('cross_entity')
      );
      
      if (crossEntityPermissions.length > 0) {
        warnings.push(`Role contains cross-entity permissions: ${crossEntityPermissions.join(', ')}`);
      }

      return {
        valid: allMissingDependencies.length === 0,
        missingDependencies: [...new Set(allMissingDependencies)],
        dependencyChain: [...new Set(allRequiredPermissions)],
        warnings
      };

    } catch (error) {
      console.error('Role assignment validation failed:', error);
      return {
        valid: false,
        missingDependencies: ['VALIDATION_ERROR'],
        dependencyChain: [],
        warnings: ['Validation process failed']
      };
    }
  }

  /**
   * Validate individual permission assignment
   */
  async validatePermissionAssignment(
    assignerId: string,
    permission: string,
    entityId: string
  ): Promise<PermissionAssignmentValidation> {
    const [action, resource] = permission.split(':');
    
    // Get dependency chain for this permission
    const dependencyResult = await granularDependencyResolver.resolvePermissionWithDependencies(
      assignerId,
      permission,
      async (userId: string, perm: string) => {
        const [permAction, permResource] = perm.split(':');
        return await rbacService.checkPermission(userId, permAction, permResource, undefined, entityId);
      }
    );

    // Get assigner's current capabilities
    const assignerPermissions = await rbacService.getUserPermissions(assignerId, entityId);
    const assignerCapabilities = assignerPermissions.map(p => `${p.action}:${p.resource}`);

    return {
      valid: dependencyResult.granted,
      requiredPermissions: dependencyResult.resolutionPath,
      missingPermissions: dependencyResult.missingDependencies,
      assignerCapabilities
    };
  }

  /**
   * Get all permissions for a role
   */
  private async getRolePermissions(roleId: string, entityId: string): Promise<string[]> {
    try {
      // This would typically query the database for role permissions
      // For now, we'll simulate based on common role patterns
      const rolePermissionMap: Record<string, string[]> = {
        'admin': [
          'users:manage', 'roles:manage', 'permissions:manage',
          'audit:view', 'tenants:manage', 'settings:manage'
        ],
        'manager': [
          'users:create', 'users:update', 'users:view',
          'roles:assign', 'roles:view', 'audit:view'
        ],
        'user': [
          'users:view', 'documents:create', 'documents:update', 'documents:view'
        ],
        'viewer': [
          'users:view', 'documents:view', 'audit:view'
        ]
      };

      // In a real implementation, this would query the database
      // For now, return based on roleId patterns
      for (const [roleName, permissions] of Object.entries(rolePermissionMap)) {
        if (roleId.toLowerCase().includes(roleName)) {
          return permissions;
        }
      }

      return [];
    } catch (error) {
      console.error('Failed to get role permissions:', error);
      return [];
    }
  }

  /**
   * Pre-validate role assignment before execution
   */
  async preValidateRoleAssignment(
    assignerId: string,
    roleId: string,
    targetUserId: string,
    entityId: string
  ): Promise<{ canProceed: boolean; blockingIssues: string[]; warnings: string[] }> {
    const validation = await this.validateRoleAssignment(assignerId, roleId, targetUserId, entityId);
    
    const blockingIssues: string[] = [];
    
    if (!validation.valid) {
      if (validation.missingDependencies.includes('ROLE_NOT_FOUND')) {
        blockingIssues.push('Role does not exist or has no permissions');
      } else if (validation.missingDependencies.includes('VALIDATION_ERROR')) {
        blockingIssues.push('Validation process failed - please try again');
      } else {
        blockingIssues.push(`Missing required permissions: ${validation.missingDependencies.join(', ')}`);
      }
    }

    return {
      canProceed: validation.valid,
      blockingIssues,
      warnings: validation.warnings
    };
  }
}

export const dependencyValidationService = DependencyValidationService.getInstance();
