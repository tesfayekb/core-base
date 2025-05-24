
# System Integration Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides patterns for integrating UI components with backend systems, focusing on RBAC, tenant awareness, and error handling.

## RBAC Integration

```typescript
// ✅ Good: Permission-aware component
interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  renderDenied?: (permission: string) => React.ReactNode;
}

export function PermissionGate({ 
  permission, 
  children, 
  fallback = null,
  renderDenied 
}: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermissions();
  
  if (isLoading) {
    return <PermissionSkeleton />;
  }
  
  if (!hasPermission(permission)) {
    return renderDenied?.(permission) || fallback;
  }
  
  return <>{children}</>;
}

// Usage
<PermissionGate permission="users.create">
  <CreateUserButton />
</PermissionGate>
```

## Tenant-Aware Components

```typescript
// ✅ Good: Tenant context integration
export function useTenantAwareQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>
) {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: ['tenant', currentTenant?.id, ...queryKey],
    queryFn,
    enabled: !!currentTenant,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

// Usage in component
function UserList() {
  const { data: users, isLoading, error } = useTenantAwareQuery(
    ['users'],
    () => userService.getUsers()
  );
  
  if (isLoading) return <UserListSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return <UserTable users={users || []} />;
}
```

## Error Boundary Integration

```typescript
// ✅ Good: Error boundary with context
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class FeatureErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to audit system
    auditLogger.error('Component error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({ errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

## Related Documentation

- **[COMPOSITION_PATTERNS.md](COMPOSITION_PATTERNS.md)**: Component composition strategies
- **[STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)**: Component state management
- **[TYPESCRIPT_INTERFACES.md](TYPESCRIPT_INTERFACES.md)**: TypeScript interface design

## Version History

- **1.0.0**: Extracted integration patterns from main component architecture document (2025-05-23)
