
import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { Skeleton } from '../ui/skeleton';

interface PermissionBoundaryProps {
  action: string;
  resource: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

/**
 * Permission boundary component for conditional rendering
 * Based on RBAC UI integration patterns from documentation
 */
export function PermissionBoundary({
  action,
  resource,
  resourceId,
  children,
  fallback = null,
  loading = <Skeleton className="h-8 w-32" />
}: PermissionBoundaryProps) {
  const { hasPermission, isLoading, error } = usePermission(action, resource, resourceId);
  
  if (isLoading) {
    return <>{loading}</>;
  }
  
  if (error) {
    console.error('Permission boundary error:', error);
    return <>{fallback}</>;
  }
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Higher-order component for permission-based component wrapping
 */
export function withPermission<T extends object>(
  Component: React.ComponentType<T>,
  action: string,
  resource: string,
  resourceId?: string
) {
  return function PermissionWrappedComponent(props: T) {
    return (
      <PermissionBoundary action={action} resource={resource} resourceId={resourceId}>
        <Component {...props} />
      </PermissionBoundary>
    );
  };
}
