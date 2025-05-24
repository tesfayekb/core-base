
# Component Design Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Established design patterns for building maintainable and scalable React components.

## Compound Components Pattern

```typescript
// ✅ Good: Compound component with context
interface CardContextValue {
  variant: 'default' | 'outlined' | 'elevated';
}

const CardContext = createContext<CardContextValue | undefined>(undefined);

export function Card({ 
  children, 
  variant = 'default',
  className,
  ...props 
}: CardProps) {
  return (
    <CardContext.Provider value={{ variant }}>
      <div 
        className={cn(cardVariants({ variant }), className)}
        {...props}
      >
        {children}
      </div>
    </CardContext.Provider>
  );
}

Card.Header = function CardHeader({ children, className, ...props }: CardHeaderProps) {
  const context = useContext(CardContext);
  return (
    <div 
      className={cn("card-header", context?.variant && `card-header--${context.variant}`, className)}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Content = function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn("card-content", className)} {...props}>
      {children}
    </div>
  );
};
```

## Render Props Pattern

```typescript
// ✅ Good: Flexible data fetching with render props
interface DataFetcherProps<T> {
  url: string;
  children: (data: {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => React.ReactNode;
}

export function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['data', url],
    queryFn: () => fetch(url).then(res => res.json())
  });
  
  return children({
    data: data || null,
    loading: isLoading,
    error: error as Error | null,
    refetch
  });
}

// Usage
<DataFetcher<User[]> url="/api/users">
  {({ data, loading, error, refetch }) => {
    if (loading) return <UserListSkeleton />;
    if (error) return <ErrorMessage error={error} onRetry={refetch} />;
    return <UserList users={data || []} />;
  }}
</DataFetcher>
```

## Higher-Order Components for Cross-Cutting Concerns

```typescript
// ✅ Good: HOC for permission checking
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: string
) {
  return function PermissionWrapper(props: P) {
    const { hasPermission } = usePermissions();
    
    if (!hasPermission(requiredPermission)) {
      return <AccessDenied permission={requiredPermission} />;
    }
    
    return <WrappedComponent {...props} />;
  };
}

// Usage
export const SecureUserManagement = withPermission(UserManagement, 'users.manage');
```

## Related Documentation

- **[COMPONENT_HIERARCHY.md](COMPONENT_HIERARCHY.md)**: Component hierarchy and organization
- **[TYPESCRIPT_INTERFACES.md](TYPESCRIPT_INTERFACES.md)**: TypeScript interface design
- **[STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)**: Component state patterns

## Version History

- **1.0.0**: Extracted from COMPONENT_ARCHITECTURE.md for optimal AI processing (2025-05-24)
