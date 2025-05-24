
# Component Design Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Proven design patterns for building scalable and maintainable React components.

## Core Design Patterns

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

## Related Documentation

- **[COMPONENT_HIERARCHY.md](COMPONENT_HIERARCHY.md)**: Component organization
- **[TYPESCRIPT_INTERFACES.md](TYPESCRIPT_INTERFACES.md)**: TypeScript patterns
- **[../COMPONENT_ARCHITECTURE.md](../COMPONENT_ARCHITECTURE.md)**: Complete architecture overview

## Version History

- **1.0.0**: Extracted from COMPONENT_ARCHITECTURE.md for optimal AI processing (2025-05-24)
