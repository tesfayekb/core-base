
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
    
    if ((action === 'Read' || action === 'Update' || action === 'Delete') && 
        await hasExplicitPermission('Manage', resource, resourceId)) {
      return true;
    }
    
    // Special case for "Any" permissions
    if (resourceId && await hasExplicitPermission(`${action}Any`, resource)) {
      return true;
    }
    
    // Check for ViewAny, UpdateAny, DeleteAny implications
    if (action === 'Read' && await hasExplicitPermission('ViewAny', resource)) {
      return true;
    }
    
    if (action === 'Update' && await hasExplicitPermission('UpdateAny', resource)) {
      return true;
    }
    
    if (action === 'Delete' && await hasExplicitPermission('DeleteAny', resource)) {
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
    if (action === 'ViewAny') {
      implied.push(`Read:${resource}`);
    }
    
    if (action === 'UpdateAny') {
      implied.push(`Update:${resource}`, `Read:${resource}`);
    }
    
    if (action === 'DeleteAny') {
      implied.push(`Delete:${resource}`, `Read:${resource}`);
    }
    
    return implied;
  }
  
  /**
   * Check if an action logically implies another action
   */
  static actionImplies(higherAction: string, lowerAction: string): boolean {
    const implications: Record<string, string[]> = {
      'Manage': ['Update', 'Delete', 'Read', 'Create'],
      'Update': ['Read'],
      'Delete': ['Read'],
      'UpdateAny': ['Update', 'Read', 'ViewAny'],
      'DeleteAny': ['Delete', 'Read', 'ViewAny'],
      'ViewAny': ['Read']
    };
    
    return implications[higherAction]?.includes(lowerAction) || false;
  }
}
