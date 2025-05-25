
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { PermissionBoundary } from '@/components/rbac/PermissionBoundary';

interface PermissionButtonProps extends ButtonProps {
  action: string;
  resource: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideWhenNoPermission?: boolean;
}

export function PermissionButton({
  action,
  resource,
  resourceId,
  children,
  fallback,
  hideWhenNoPermission = true,
  ...buttonProps
}: PermissionButtonProps) {
  return (
    <PermissionBoundary
      action={action}
      resource={resource}
      resourceId={resourceId}
      fallback={hideWhenNoPermission ? null : fallback}
    >
      <Button {...buttonProps}>
        {children}
      </Button>
    </PermissionBoundary>
  );
}
