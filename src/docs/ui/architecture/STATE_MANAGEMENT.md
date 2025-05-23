
# Component State Management Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides guidelines for managing state within React components, including local state, context usage, and integration patterns.

## Local State Management

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

## Context for Complex State

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

## Related Documentation

- **[COMPOSITION_PATTERNS.md](COMPOSITION_PATTERNS.md)**: Component composition patterns
- **[TYPESCRIPT_INTERFACES.md](TYPESCRIPT_INTERFACES.md)**: TypeScript interface design patterns
- **[INTEGRATION_PATTERNS.md](INTEGRATION_PATTERNS.md)**: System integration patterns

## Version History

- **1.0.0**: Extracted state management patterns from main component architecture document (2025-05-23)
