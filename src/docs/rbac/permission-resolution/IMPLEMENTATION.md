# Permission Resolution Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document provides details on the frontend and backend implementation of the permission resolution system, including code examples and integration points.

## Backend Implementation

### Database Functions

Core database functions that implement permission resolution:

```sql
-- Check if user has permission
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_resource_id UUID;
BEGIN
  -- Short circuit for SuperAdmin
  IF is_super_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Get resource ID
  SELECT id INTO v_resource_id
  FROM resources
  WHERE name = p_resource;
  
  IF v_resource_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get current tenant context
  DECLARE v_tenant_id UUID := current_tenant_id();
  
  -- Check if user has permission through any of their roles
  SELECT EXISTS (
    -- Global roles
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id
    AND p.resource_id = v_resource_id
    AND p.action = p_action
    
    UNION
    
    -- Tenant-specific roles (if in tenant context)
    SELECT 1
    FROM role_permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_tenants ut ON rp.role_id = ut.role_id
    WHERE ut.user_id = p_user_id
    AND v_tenant_id IS NOT NULL
    AND ut.tenant_id = v_tenant_id
    AND p.resource_id = v_resource_id
    AND p.action = p_action
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

-- Get all permissions for a user in current tenant context
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID
) RETURNS TABLE (
  resource_name TEXT,
  action_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Short circuit for SuperAdmin - return all permissions
  IF is_super_admin(p_user_id) THEN
    RETURN QUERY
      SELECT r.name, p.action
      FROM resources r
      JOIN resource_permission_actions rpa ON r.id = rpa.resource_id
      JOIN permissions p ON r.id = p.resource_id AND rpa.action_key = p.action
      WHERE rpa.is_active = true;
    RETURN;
  END IF;
  
  -- Get current tenant context
  v_tenant_id := current_tenant_id();
  
  -- Return permissions from all user roles
  RETURN QUERY
    -- Global roles
    SELECT r.name, p.action
    FROM resources r
    JOIN permissions p ON r.id = p.resource_id
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
    
    UNION
    
    -- Tenant-specific roles (if in tenant context)
    SELECT r.name, p.action
    FROM resources r
    JOIN permissions p ON r.id = p.resource_id
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_tenants ut ON rp.role_id = ut.role_id
    WHERE ut.user_id = p_user_id
    AND v_tenant_id IS NOT NULL
    AND ut.tenant_id = v_tenant_id;
END;
$$;
```

### API Endpoints

API endpoints for permission resolution:

```typescript
// Permission check endpoint
router.get('/api/permissions/check', async (req, res) => {
  try {
    const { action, resource, resourceId } = req.query;
    const userId = req.user.id;
    
    if (!action || !resource) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const hasPermission = await permissionService.checkPermission(
      userId,
      action as string,
      resource as string,
      resourceId as string
    );
    
    return res.json({ hasPermission });
  } catch (error) {
    console.error('Permission check error:', error);
    return res.status(500).json({ error: 'Failed to check permission' });
  }
});

// Get all user permissions endpoint
router.get('/api/permissions', async (req, res) => {
  try {
    const userId = req.user.id;
    const permissions = await permissionService.getUserPermissions(userId);
    
    return res.json({ permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    return res.status(500).json({ error: 'Failed to retrieve permissions' });
  }
});
```

### Permission Service

Service layer for permission resolution:

```typescript
class PermissionService {
  private cache: PermissionCache;
  
  constructor() {
    this.cache = new PermissionCache();
  }
  
  /**
   * Check if a user has a specific permission
   */
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    // Check if SuperAdmin (always return true)
    if (await this.isSuperAdmin(userId)) {
      return true;
    }
    
    // Generate cache key
    const cacheKey = `${userId}:${resource}:${action}${resourceId ? `:${resourceId}` : ''}`;
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    
    // Perform database check
    const { data, error } = await supabase.rpc('check_permission', {
      p_user_id: userId,
      p_action: action,
      p_resource: resource,
      p_resource_id: resourceId
    });
    
    if (error) {
      console.error('Permission check error:', error);
      return false;
    }
    
    // Cache result
    this.cache.set(cacheKey, !!data);
    
    return !!data;
  }
  
  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    // Check if SuperAdmin (return all permissions)
    if (await this.isSuperAdmin(userId)) {
      return await this.getAllSystemPermissions();
    }
    
    // Get from database
    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Get permissions error:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Check if user is SuperAdmin
   */
  private async isSuperAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .inner_join('roles on user_roles.role_id = roles.id')
      .eq('roles.name', 'SuperAdmin')
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get all system permissions
   */
  private async getAllSystemPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions_view')
      .select('resource_name, action_name');
    
    if (error) {
      console.error('Get all permissions error:', error);
      return [];
    }
    
    return data || [];
  }
}
```

## Frontend Implementation

### Permission Hook

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

### Permission Context

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

### Permission Gate Component

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

## Integration Examples

### API Route Protection

Middleware for protecting API routes with permission checks:

```typescript
/**
 * Permission middleware for API routes
 */
export function requirePermission(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Extract resourceId from request parameters if present
      const resourceId = req.params.id;
      
      // Check permission
      const permissionService = new PermissionService();
      const hasPermission = await permissionService.checkPermission(
        userId,
        action,
        resource,
        resourceId
      );
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // User has permission, proceed
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Usage in routes
router.get(
  '/api/users',
  requirePermission('ViewAny', 'users'),
  usersController.listUsers
);

router.get(
  '/api/users/:id',
  requirePermission('View', 'users'),
  usersController.getUser
);
```

### UI Component Integration

Example of UI components using permission checks:

```tsx
// Button with permission check
interface PermissionButtonProps extends ButtonProps {
  action: string;
  resource: string;
  resourceId?: string;
}

export function PermissionButton({
  action,
  resource,
  resourceId,
  children,
  ...props
}: PermissionButtonProps) {
  const { hasPermission } = usePermission(action, resource, resourceId);
  
  if (!hasPermission) {
    return null;
  }
  
  return <Button {...props}>{children}</Button>;
}

// Example usage in a component
function UserActions({ user }: { user: User }) {
  return (
    <div className="actions">
      <PermissionButton
        action="View"
        resource="users"
        resourceId={user.id}
        onClick={() => viewUser(user.id)}
      >
        View
      </PermissionButton>
      
      <PermissionButton
        action="Update"
        resource="users"
        resourceId={user.id}
        onClick={() => editUser(user.id)}
      >
        Edit
      </PermissionButton>
      
      <PermissionButton
        action="Delete"
        resource="users"
        resourceId={user.id}
        onClick={() => deleteUser(user.id)}
      >
        Delete
      </PermissionButton>
    </div>
  );
}
```

### User Menu Based on Permissions

Dynamic user menu based on permissions:

```tsx
function MainNavigation() {
  const { permissions, isLoading } = usePermissionContext();
  
  // Define menu items with required permissions
  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', permission: 'View:dashboard' },
    { label: 'Users', path: '/users', permission: 'ViewAny:users' },
    { label: 'Roles', path: '/roles', permission: 'ViewAny:roles' },
    { label: 'Settings', path: '/settings', permission: 'View:settings' },
    { label: 'Reports', path: '/reports', permission: 'ViewAny:reports' }
  ];
  
  // Filter menu items based on permissions
  const authorizedMenuItems = menuItems.filter(item => {
    if (!item.permission) return true; // No permission required
    
    if (isLoading) return false; // Hide while loading permissions
    
    const [action, resource] = item.permission.split(':');
    return permissions.includes(`${action}:${resource}`);
  });
  
  return (
    <nav className="main-nav">
      <ul>
        {authorizedMenuItems.map(item => (
          <li key={item.path}>
            <Link to={item.path}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

## Related Documentation

- **[PERMISSION_MODEL.md](PERMISSION_MODEL.md)**: Core permission model
- **[RESOLUTION_ALGORITHM.md](RESOLUTION_ALGORITHM.md)**: Permission resolution algorithm
- **[../CACHING_STRATEGY.md](../CACHING_STRATEGY.md)**: Permission caching approach
- **[../DATABASE_OPTIMIZATION.md](../DATABASE_OPTIMIZATION.md)**: SQL optimization for permissions
- **[../../integration/SECURITY_RBAC_INTEGRATION.md](../../integration/SECURITY_RBAC_INTEGRATION.md)**: Security and RBAC integration

## Version History

- **1.0.0**: Initial document creation from permission resolution refactoring (2025-05-22)
