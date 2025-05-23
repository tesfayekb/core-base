# Frontend Permission Resolution Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the frontend implementation of the permission resolution system, including React hooks, components, and context providers for permission-based rendering.

## Permission Hook

React hook for checking permissions in components:

```typescript
/**
 * Hook to check if the current user has a specific permission
 */
export function usePermission(action: string, resource: string, resourceId?: string) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkPermission = async () => {
      // Default to no permission
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(
          `/api/permissions/check?action=${action}&resource=${resource}${
            resourceId ? `&resourceId=${resourceId}` : ''
          }`
        );
        
        if (response.ok) {
          const result = await response.json();
          setHasPermission(result.hasPermission);
        } else {
          console.error('Permission check failed:', response.status);
          setHasPermission(false);
        }
      } catch (error) {
        console.error('Permission check error:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkPermission();
  }, [user, action, resource, resourceId]);
  
  return { hasPermission, loading };
}
```

## Permission Context

React context for global permission state:

```typescript
interface PermissionContextType {
  permissions: string[];
  loadPermissions: () => Promise<void>;
  hasPermission: (action: string, resource: string) => boolean;
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/permissions');
      
      if (response.ok) {
        const result = await response.json();
        // Format permissions as "action:resource"
        const formattedPermissions = result.permissions.map(
          (p: any) => `${p.action_name}:${p.resource_name}`
        );
        setPermissions(formattedPermissions);
      } else {
        console.error('Failed to load permissions:', response.status);
        setPermissions([]);
      }
    } catch (error) {
      console.error('Permission loading error:', error);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // Load permissions when user changes
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);
  
  const hasPermission = useCallback(
    (action: string, resource: string) => {
      // While loading, default to no permission
      if (isLoading) return false;
      
      const permissionKey = `${action}:${resource}`;
      return permissions.includes(permissionKey);
    },
    [permissions, isLoading]
  );
  
  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loadPermissions,
        hasPermission,
        isLoading
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
}
```

## Permission Gate Component

Component for conditional rendering based on permissions:

```typescript
interface PermissionGateProps {
  action: string;
  resource: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  action,
  resource,
  resourceId,
  children,
  fallback = null
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermission(action, resource, resourceId);
  
  // While loading, render nothing
  if (loading) {
    return null;
  }
  
  // If user has permission, render children
  if (hasPermission) {
    return <>{children}</>;
  }
  
  // Otherwise render fallback
  return <>{fallback}</>;
}
```

## Related Documentation

- **[IMPLEMENTATION_OVERVIEW.md](IMPLEMENTATION_OVERVIEW.md)**: Implementation overview
- **[BACKEND_IMPLEMENTATION.md](BACKEND_IMPLEMENTATION.md)**: Backend implementation details
- **[UI_INTEGRATION.md](UI_INTEGRATION.md)**: UI integration patterns
- **[../PERMISSION_TYPES.md](../PERMISSION_TYPES.md)**: Permission taxonomy
- **[../CACHING_STRATEGY.md](../CACHING_STRATEGY.md)**: Permission caching approach

## Version History

- **1.0.0**: Initial document created from IMPLEMENTATION.md refactoring (2025-05-23)
