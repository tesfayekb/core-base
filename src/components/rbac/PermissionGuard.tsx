// Permission Guard Component
// Version: 1.0.0
// Phase 1.4: RBAC Foundation

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { rbacService } from '@/services/rbac/rbacService';
import { PermissionAction, ResourceType } from '@/types/rbac';

interface PermissionGuardProps {
  action: PermissionAction;
  resource: ResourceType;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean; // For multiple permissions
}

interface MultiplePermissionGuardProps {
  permissions: Array<{
    action: PermissionAction;
    resource: ResourceType;
    resourceId?: string;
  }>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean; // true = AND logic, false = OR logic
}

export function PermissionGuard({ 
  action, 
  resource, 
  resourceId, 
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkPermission();
  }, [user?.id, action, resource, resourceId]);

  const checkPermission = async () => {
    if (!user?.id) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await rbacService.checkPermission({
        userId: user.id,
        action,
        resource,
        resourceId
      });
      setHasPermission(result);
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

export function MultiplePermissionGuard({ 
  permissions, 
  children, 
  fallback = null, 
  requireAll = false 
}: MultiplePermissionGuardProps) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    checkPermissions();
  }, [user?.id, permissions, requireAll]);

  const checkPermissions = async () => {
    if (!user?.id || permissions.length === 0) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const checks = permissions.map(p => ({
        userId: user.id!,
        action: p.action,
        resource: p.resource,
        resourceId: p.resourceId
      }));

      const results = await rbacService.batchCheckPermissions(checks);
      const resultValues = Object.values(results);
      
      const hasAccess = requireAll 
        ? resultValues.every(Boolean) 
        : resultValues.some(Boolean);
        
      setHasPermission(hasAccess);
    } catch (error) {
      console.error('Permissions check failed:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
