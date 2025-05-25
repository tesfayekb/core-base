
import React from 'react';
import { PermissionBoundary } from '@/components/rbac/PermissionBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface PermissionSectionProps {
  action: string;
  resource: string;
  resourceId?: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
  showFallback?: boolean;
  fallback?: React.ReactNode;
}

export function PermissionSection({
  action,
  resource,
  resourceId,
  children,
  title,
  description,
  showFallback = true,
  fallback
}: PermissionSectionProps) {
  const defaultFallback = showFallback ? (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">Access Restricted</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          You don't have permission to view this content.
        </p>
      </CardContent>
    </Card>
  ) : null;

  return (
    <PermissionBoundary
      action={action}
      resource={resource}
      resourceId={resourceId}
      fallback={fallback || defaultFallback}
    >
      {title ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {children}
        </div>
      ) : (
        children
      )}
    </PermissionBoundary>
  );
}
