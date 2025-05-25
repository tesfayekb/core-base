
// Permission Dependencies Implementation
// Based on src/docs/rbac/PERMISSION_DEPENDENCIES.md

import { PermissionAction } from '../../types/rbac';

/**
 * Implements functional permission dependencies from PERMISSION_DEPENDENCIES.md
 * CRITICAL: This ensures permission checks include implied permissions
 */
export class PermissionDependencyResolver {
  
  /**
   * Check if user has permission including dependency resolution
   */
  static async checkPermissionWithDependencies(
    hasExplicitPermission: (action: string, resource: string, resourceId?: string) => Promise<boolean>,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    // Direct permission check
    if (await hasExplicitPermission(action, resource, resourceId)) {
      return true;
    }
    
    // Check for higher-level permissions that imply this one
    if (action === 'Read' && await hasExplicitPermission('Update', resource, resourceId)) {
      return true;
    }
    
    if (action === 'Read' && await hasExplicitPermission('Delete', resource, resourceId)) {
      return true;
    }
    
    if (action === 'Update' && await hasExplicitPermission('Manage', resource, resourceId)) {
      return true;
    }
    
    if (action === 'Delete' && await hasExplicitPermission('Manage', resource, resourceId)) {
      return true;
    }
    
    // Special case for "Any" permissions
    if (resourceId && await hasExplicitPermission(`${action}Any`, resource)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get all implied permissions for a given permission
   */
  static getImpliedPermissions(action: PermissionAction, resource: string): string[] {
    const implied: string[] = [];
    
    // Higher-level permissions imply lower-level ones
    if (action === 'Manage') {
      implied.push(`Update:${resource}`, `Delete:${resource}`, `Read:${resource}`);
    }
    
    if (action === 'Update' || action === 'Delete') {
      implied.push(`Read:${resource}`);
    }
    
    // "Any" permissions imply specific resource permissions
    if (action.endsWith('Any')) {
      const baseAction = action.replace('Any', '');
      implied.push(`${baseAction}:${resource}`);
    }
    
    return implied;
  }
}
