
// RBAC React Hook
// Version: 1.0.0
// Phase 1.4: RBAC Foundation

import { useState, useEffect, useCallback } from 'react';
import { rbacService } from '@/services/rbac/rbacService';
import { useAuth } from '@/contexts/AuthProvider';
import { 
  PermissionCheck, 
  EffectivePermission, 
  Role, 
  PermissionAction, 
  ResourceType 
} from '@/types/rbac';

export function useRBAC() {
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<EffectivePermission[]>([]);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user permissions and roles
  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [permissions, roles] = await Promise.all([
        rbacService.getUserPermissions(user.id),
        rbacService.getUserRoles(user.id)
      ]);
      
      setUserPermissions(permissions);
      setUserRoles(roles);
    } catch (error) {
      console.error('Failed to load user RBAC data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check single permission
  const hasPermission = useCallback(async (
    action: PermissionAction,
    resource: ResourceType,
    resourceId?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    const check: PermissionCheck = {
      userId: user.id,
      action,
      resource,
      resourceId
    };

    return await rbacService.checkPermission(check);
  }, [user?.id]);

  // Check multiple permissions at once
  const hasAnyPermission = useCallback(async (
    permissions: { action: PermissionAction; resource: ResourceType; resourceId?: string }[]
  ): Promise<boolean> => {
    if (!user?.id || permissions.length === 0) return false;

    const checks = permissions.map(p => ({
      userId: user.id!,
      action: p.action,
      resource: p.resource,
      resourceId: p.resourceId
    }));

    const results = await rbacService.batchCheckPermissions(checks);
    return Object.values(results).some(Boolean);
  }, [user?.id]);

  // Check if user has all specified permissions
  const hasAllPermissions = useCallback(async (
    permissions: { action: PermissionAction; resource: ResourceType; resourceId?: string }[]
  ): Promise<boolean> => {
    if (!user?.id || permissions.length === 0) return false;

    const checks = permissions.map(p => ({
      userId: user.id!,
      action: p.action,
      resource: p.resource,
      resourceId: p.resourceId
    }));

    const results = await rbacService.batchCheckPermissions(checks);
    return Object.values(results).every(Boolean);
  }, [user?.id]);

  // Assign role to user
  const assignRole = useCallback(async (
    roleId: string,
    tenantId?: string,
    expiresAt?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    const success = await rbacService.assignRole({
      userId: user.id,
      roleId,
      tenantId,
      assignedBy: user.id, // Self-assignment in this context
      expiresAt
    });

    if (success) {
      await loadUserData(); // Refresh data
    }

    return success;
  }, [user?.id]);

  // Remove role from user
  const removeRole = useCallback(async (
    roleId: string,
    tenantId?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    const success = await rbacService.removeRole(user.id, roleId, tenantId);

    if (success) {
      await loadUserData(); // Refresh data
    }

    return success;
  }, [user?.id]);

  // Check if user has specific role
  const hasRole = useCallback((roleName: string): boolean => {
    return userRoles.some(role => role.name === roleName);
  }, [userRoles]);

  // Check if user is admin (has any admin role)
  const isAdmin = useCallback((): boolean => {
    return userRoles.some(role => 
      role.name.toLowerCase().includes('admin') || role.is_system_role
    );
  }, [userRoles]);

  return {
    // Data
    userPermissions,
    userRoles,
    loading,
    
    // Permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Role management
    assignRole,
    removeRole,
    hasRole,
    isAdmin,
    
    // Utilities
    refreshData: loadUserData
  };
}
