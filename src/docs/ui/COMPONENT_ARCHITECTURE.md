
# Component Architecture

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Component architecture guidelines for building scalable, maintainable, and reusable React components within the design system.

## Component Hierarchy

### Base Components (Tier 1)
Fundamental UI primitives from shadcn/ui:
- **Button**: Basic button component with variants
- **Input**: Text input with validation states
- **Card**: Container component for content grouping
- **Badge**: Small status and label component
- **Separator**: Visual separation between content

### Composite Components (Tier 2)
Complex components built from base components:
- **Form**: Complete form with validation and submission
- **DataTable**: Advanced table with sorting and filtering
- **Modal**: Dialog component with overlay and actions
- **Navigation**: Header and sidebar navigation components
- **UserProfile**: User information display and editing

### Feature Components (Tier 3)
Business-specific components:
- **TenantSwitcher**: Multi-tenant context switching
- **PermissionBoundary**: RBAC-aware content rendering
- **AuditLog**: Audit trail display and filtering
- **Dashboard**: Analytics and metrics visualization
- **UserManagement**: Complete user administration interface

## Component Design Patterns

### Composition Pattern
```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'elevated';
}

const Card: React.FC<CardProps> = ({ children, className, variant = 'default' }) => {
  return (
    <div className={cn(cardVariants({ variant }), className)}>
      {children}
    </div>
  );
};

// Usage with composition
<Card variant="elevated">
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  <CardContent>
    <UserProfile user={currentUser} />
  </CardContent>
  <CardFooter>
    <Button>Edit Profile</Button>
  </CardFooter>
</Card>
```

### Render Props Pattern
```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode;
}

const DataFetcher = <T,>({ url, children }: DataFetcherProps<T>) => {
  const { data, isLoading, error } = useQuery({ queryKey: [url], queryFn: () => fetch(url) });
  
  return <>{children(data, isLoading, error)}</>;
};

// Usage
<DataFetcher<User[]> url="/api/users">
  {(users, loading, error) => (
    loading ? <Skeleton /> : <UserList users={users || []} />
  )}
</DataFetcher>
```

### Compound Component Pattern
```typescript
interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const Tabs: React.FC<{ children: React.ReactNode; defaultValue: string }> = ({ 
  children, 
  defaultValue 
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="tabs-list">{children}</div>
);

const TabsTrigger: React.FC<{ value: string; children: React.ReactNode }> = ({ 
  value, 
  children 
}) => {
  const { activeTab, setActiveTab } = useContext(TabsContext)!;
  
  return (
    <button
      className={cn("tabs-trigger", activeTab === value && "active")}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};
```

## TypeScript Integration

### Prop Interface Design
```typescript
// Base props interface
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

// Variant-based props
interface ButtonProps extends BaseComponentProps {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// Generic component props
interface ListProps<T> extends BaseComponentProps {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyState?: React.ReactNode;
}
```

### Component Generics
```typescript
const List = <T,>({ 
  items, 
  renderItem, 
  keyExtractor, 
  emptyState,
  className 
}: ListProps<T>) => {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn("list", className)}>
      {items.map((item, index) => (
        <div key={keyExtractor(item)} className="list-item">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};
```

## State Management Patterns

### Local Component State
```typescript
const UserForm: React.FC<{ user?: User; onSubmit: (user: User) => void }> = ({ 
  user, 
  onSubmit 
}) => {
  const [formData, setFormData] = useState<Partial<User>>(user || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData as User);
    } catch (error) {
      setErrors({ submit: 'Failed to save user' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

### Context-Based State
```typescript
interface UserContextType {
  currentUser: User | null;
  updateUser: (user: Partial<User>) => Promise<void>;
  logout: () => void;
}

const UserContext = React.createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
```

## Performance Optimization

### Memoization Strategies
```typescript
// Memo for expensive renders
const ExpensiveComponent = React.memo<{ data: ComplexData }>(({ data }) => {
  const processedData = useMemo(() => 
    expensiveDataProcessing(data), 
    [data]
  );

  return <div>{/* Render processed data */}</div>;
});

// Callback memoization
const ParentComponent: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);

  const handleItemClick = useCallback((id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  }, []);

  return (
    <List
      items={items}
      renderItem={(item) => (
        <ItemComponent 
          item={item} 
          onClick={handleItemClick}
        />
      )}
    />
  );
};
```

### Code Splitting
```typescript
// Lazy component loading
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));

const App: React.FC = () => (
  <Router>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UserManagementPage />} />
      </Routes>
    </Suspense>
  </Router>
);
```

## Testing Architecture

### Component Testing Structure
```typescript
describe('Button Component', () => {
  const defaultProps = {
    children: 'Click me',
    onClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct text', () => {
    render(<Button {...defaultProps} />);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies variant styles correctly', () => {
    render(<Button {...defaultProps} variant="secondary" />);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary-100');
  });

  it('handles click events', () => {
    render(<Button {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
  });
});
```

## Error Boundaries

### Component Error Handling
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ComponentErrorBoundary extends React.Component<
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
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="error-boundary">
          <CardContent>
            <p>Something went wrong with this component.</p>
            <Button onClick={() => this.setState({ hasError: false })}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
```

## Related Documentation

- **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)**: Design tokens and styling
- **[RESPONSIVE_DESIGN.md](RESPONSIVE_DESIGN.md)**: Responsive component patterns
- **[ACCESSIBILITY.md](ACCESSIBILITY.md)**: Accessibility implementation
- **[../UI_STANDARDS.md](../UI_STANDARDS.md)**: UI implementation standards

## Version History

- **1.0.0**: Initial component architecture documentation (2025-05-24)
