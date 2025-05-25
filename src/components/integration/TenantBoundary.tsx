
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TenantBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  requireTenant?: boolean;
}

export function TenantBoundary({
  children,
  fallback,
  loading,
  requireTenant = true
}: TenantBoundaryProps) {
  const { user, tenantId, isLoading } = useAuth();

  // Show loading state while auth is initializing
  if (isLoading) {
    return loading || <TenantBoundaryLoading />;
  }

  // If no user, show auth required
  if (!user) {
    return fallback || <TenantBoundaryAuthRequired />;
  }

  // If tenant required but not available, show tenant selection
  if (requireTenant && !tenantId) {
    return fallback || <TenantBoundaryTenantRequired />;
  }

  // Render children with tenant context
  return <>{children}</>;
}

function TenantBoundaryLoading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function TenantBoundaryAuthRequired() {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            You need to be signed in to access this content.
          </p>
          <Button onClick={() => window.location.href = '/auth'}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TenantBoundaryTenantRequired() {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle>Tenant Selection Required</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Please select a tenant to continue accessing the application.
          </p>
          <Button>
            Select Tenant
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Higher-order component for tenant-aware components
export function withTenantBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options?: Omit<TenantBoundaryProps, 'children'>
) {
  return function TenantBoundaryWrappedComponent(props: T) {
    return (
      <TenantBoundary {...options}>
        <Component {...props} />
      </TenantBoundary>
    );
  };
}
