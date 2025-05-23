
# Component Architecture Guidelines

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides detailed guidelines for implementing component architecture in the application, including composition patterns, TypeScript interfaces, and integration with system features.

## Component Design Patterns

### Composition over Inheritance

Components should be designed for composition rather than inheritance:

```typescript
// ✅ Good: Composable component design
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  className?: string;
}

export function Card({ children, variant = 'default', className, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

// Usage with composition
<Card variant="elevated">
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  <CardContent>
    <UserProfile user={user} />
  </CardContent>
</Card>
```

### Compound Components Pattern

For complex components with multiple related parts:

```typescript
// ✅ Good: Compound component pattern
interface DataTableProps {
  data: any[];
  children: React.ReactNode;
}

function DataTable({ data, children }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filtering, setFiltering] = useState<ColumnFiltersState>([]);
  
  const contextValue = useMemo(() => ({
    data,
    sorting,
    setSorting,
    filtering,
    setFiltering
  }), [data, sorting, filtering]);
  
  return (
    <DataTableContext.Provider value={contextValue}>
      <div className="data-table">
        {children}
      </div>
    </DataTableContext.Provider>
  );
}

// Sub-components
DataTable.Header = DataTableHeader;
DataTable.Body = DataTableBody;
DataTable.Pagination = DataTablePagination;

// Usage
<DataTable data={users}>
  <DataTable.Header />
  <DataTable.Body />
  <DataTable.Pagination />
</DataTable>
```

## TypeScript Interface Design

### Props Interface Standards

```typescript
// ✅ Good: Well-designed props interface
interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  // Core functionality
  children: React.ReactNode;
  loading?: boolean;
  
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
  
  // Styling variants
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  // Event handlers with proper types
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  // Composition
  asChild?: boolean;
}
```

### Generic Component Interfaces

```typescript
// ✅ Good: Generic interfaces for reusable components
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function List<T>({ 
  items, 
  renderItem, 
  keyExtractor, 
  emptyState,
  loading,
  className 
}: ListProps<T>) {
  if (loading) {
    return <ListSkeleton />;
  }
  
  if (items.length === 0) {
    return emptyState || <EmptyState />;
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <div key={keyExtractor(item)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
```

## State Management Patterns

### Local State Management

```typescript
// ✅ Good: Proper local state management
interface FormData {
  name: string;
  email: string;
  role: string;
}

export function UserForm({ onSubmit, initialData }: UserFormProps) {
  const [formData, setFormData] = useState<FormData>(
    initialData || { name: '', email: '', role: '' }
  );
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors = validateFormData(formData);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const updateField = (field: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
    </form>
  );
}
```

### Context for Complex State

```typescript
// ✅ Good: Context for complex shared state
interface AppContextType {
  user: User | null;
  tenant: Tenant | null;
  permissions: string[];
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  hasPermission: (action: string, resource: string) => boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const hasPermission = useCallback(
    (action: string, resource: string) => {
      return permissions.includes(`${action}:${resource}`);
    },
    [permissions]
  );
  
  const value = useMemo(() => ({
    user,
    tenant,
    permissions,
    theme,
    setTheme,
    hasPermission
  }), [user, tenant, permissions, theme, hasPermission]);
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

## Integration Patterns

### Permission-Based Rendering

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

### Tenant-Aware Components

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

- **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)**: Design system specifications
- **[RESPONSIVE_DESIGN.md](RESPONSIVE_DESIGN.md)**: Responsive implementation guidelines
- **[ACCESSIBILITY.md](ACCESSIBILITY.md)**: Accessibility implementation
- **[PERFORMANCE.md](PERFORMANCE.md)**: UI performance optimization
- **[../UI_STANDARDS.md](../UI_STANDARDS.md)**: Core UI standards
- **[../rbac/permission-resolution/UI_INTEGRATION.md](../rbac/permission-resolution/UI_INTEGRATION.md)**: RBAC UI patterns

## Version History

- **1.0.0**: Initial component architecture guidelines (2025-05-23)
