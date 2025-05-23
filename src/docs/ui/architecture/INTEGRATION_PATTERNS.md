
# System Integration Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document outlines patterns for integrating UI components with system features like RBAC, multi-tenancy, and error handling.

## Permission-Based Rendering

```typescript
// ✅ Good: Permission-aware component patterns
interface PermissionBoundaryProps {
  action: string;
  resource: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export function PermissionBoundary({
  action,
  resource,
  resourceId,
  children,
  fallback = null,
  loading = <Skeleton />
}: PermissionBoundaryProps) {
  const { hasPermission, isLoading } = usePermission(action, resource, resourceId);
  
  if (isLoading) {
    return <>{loading}</>;
  }
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Usage
<PermissionBoundary action="Update" resource="users" resourceId={user.id}>
  <EditButton onClick={() => editUser(user.id)} />
</PermissionBoundary>
```

## Tenant-Aware Components

```typescript
// ✅ Good: Tenant context integration
export function TenantAwareComponent({ children }: { children: React.ReactNode }) {
  const { tenant } = useApp();
  const { data: tenantConfig } = useQuery({
    queryKey: ['tenant-config', tenant?.id],
    queryFn: () => fetchTenantConfig(tenant?.id),
    enabled: !!tenant?.id
  });
  
  if (!tenant) {
    return <TenantSelector />;
  }
  
  return (
    <div className={cn(
      "tenant-aware",
      tenantConfig?.theme && `theme-${tenantConfig.theme}`
    )}>
      {children}
    </div>
  );
}
```

## Error Boundary Implementation

```typescript
// ✅ Good: Comprehensive error boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    
    // Log to monitoring service
    this.logErrorToService(error, errorInfo);
    
    this.setState({ errorInfo });
  }
  
  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // Implementation would integrate with monitoring service
    console.error('Error logged to monitoring service', { error, errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary p-6 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-4">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-4">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Refresh Page
          </Button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## Related Documentation

- **[COMPOSITION_PATTERNS.md](COMPOSITION_PATTERNS.md)**: Component composition patterns
- **[TYPESCRIPT_INTERFACES.md](TYPESCRIPT_INTERFACES.md)**: TypeScript interface design patterns
- **[STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)**: Component state management patterns
- **[../../rbac/permission-resolution/UI_INTEGRATION.md](../../rbac/permission-resolution/UI_INTEGRATION.md)**: RBAC UI integration patterns

## Version History

- **1.0.0**: Extracted integration patterns from main component architecture document (2025-05-23)
