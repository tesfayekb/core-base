
# Component State Management

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides guidelines for managing state in React components, from local component state to global application state.

## Local State Patterns

```typescript
// ✅ Good: Clear state structure with proper typing
interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
}

export function useFormState<T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: any
) {
  const [state, setState] = useState<FormState>({
    values: initialValues,
    errors: {},
    isSubmitting: false,
    isDirty: false
  });
  
  const updateField = useCallback((name: keyof T, value: any) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [name]: value },
      isDirty: true,
      errors: { ...prev.errors, [name]: '' }
    }));
  }, []);
  
  return { state, updateField };
}
```

## Context Usage Guidelines

```typescript
// ✅ Good: Well-designed context with provider
interface TenantContextValue {
  currentTenant: Tenant | null;
  switchTenant: (tenantId: string) => Promise<void>;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const switchTenant = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    try {
      const tenant = await tenantService.switchTenant(tenantId);
      setCurrentTenant(tenant);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return (
    <TenantContext.Provider value={{ currentTenant, switchTenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
```

## Related Documentation

- **[COMPOSITION_PATTERNS.md](COMPOSITION_PATTERNS.md)**: Component composition strategies
- **[TYPESCRIPT_INTERFACES.md](TYPESCRIPT_INTERFACES.md)**: TypeScript interface design
- **[INTEGRATION_PATTERNS.md](INTEGRATION_PATTERNS.md)**: System integration patterns

## Version History

- **1.0.0**: Extracted state management patterns from main component architecture document (2025-05-23)
