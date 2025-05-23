
# AI Permission Implementation Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This guide provides AI developers with a streamlined approach to implementing the permission system without navigating multiple complex documents. It consolidates the essential patterns and code examples needed for implementation.

## Quick Implementation Pattern

The permission system uses **direct permission assignment** - no role hierarchy or inheritance. Users get permissions through roles, and effective permissions are the union of all their role permissions.

### 1. Core Permission Check (Backend)

```typescript
// Core permission service - create this first
export class PermissionService {
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    tenantId?: string
  ): Promise<boolean> {
    // 1. SuperAdmin always has access
    if (await this.isSuperAdmin(userId)) return true;
    
    // 2. Check cache first
    const cacheKey = `${userId}:${tenantId}:${resource}:${action}`;
    const cached = await this.cache.get(cacheKey);
    if (cached !== undefined) return cached;
    
    // 3. Query database for direct permissions
    const { data } = await this.supabase.rpc('check_user_permission', {
      p_user_id: userId,
      p_resource: resource,
      p_action: action,
      p_tenant_id: tenantId
    });
    
    // 4. Cache and return result
    await this.cache.set(cacheKey, !!data, 300); // 5 min cache
    return !!data;
  }
  
  private async isSuperAdmin(userId: string): Promise<boolean> {
    const { data } = await this.supabase.rpc('is_super_admin', {
      p_user_id: userId
    });
    return !!data;
  }
}
```

### 2. Database Function (SQL)

```sql
-- Create this database function for permission checks
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT,
  p_tenant_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has permission through any of their roles
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    JOIN resources r ON p.resource_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = p_resource
    AND p.action = p_action
    AND (p_tenant_id IS NULL OR ur.tenant_id = p_tenant_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. React Hook for UI

```typescript
// Permission hook for React components
export function usePermission(
  resource: string,
  action: string,
  resourceId?: string
): { hasPermission: boolean; isLoading: boolean } {
  const { user, currentTenantId } = useAuth();
  
  const { data: hasPermission, isLoading } = useQuery({
    queryKey: ['permission', user?.id, resource, action, currentTenantId],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const response = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource,
          action,
          resourceId,
          tenantId: currentTenantId
        })
      });
      
      const result = await response.json();
      return result.hasPermission;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  return { hasPermission: !!hasPermission, isLoading };
}
```

### 4. Permission Gate Component

```typescript
// Simple permission gate for conditional rendering
export function PermissionGate({
  resource,
  action,
  children,
  fallback = null
}: {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, isLoading } = usePermission(resource, action);
  
  if (isLoading) return <div className="animate-pulse">Loading...</div>;
  if (!hasPermission) return <>{fallback}</>;
  
  return <>{children}</>;
}

// Usage:
// <PermissionGate resource="users" action="create">
//   <CreateUserButton />
// </PermissionGate>
```

### 5. API Route Protection

```typescript
// Middleware for protecting API routes
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const permissionService = new PermissionService();
    const hasPermission = await permissionService.checkPermission(
      userId,
      resource,
      action,
      tenantId
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    next();
  };
}

// Usage:
// app.post('/api/users', requirePermission('users', 'create'), createUserHandler);
```

## Database Schema (Essential Tables)

```sql
-- Core tables for permission system
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE
);

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID REFERENCES resources(id),
  action TEXT NOT NULL,
  UNIQUE(resource_id, action)
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  role_id UUID REFERENCES roles(id),
  tenant_id UUID,
  UNIQUE(user_id, role_id, tenant_id)
);
```

## Common Permission Patterns

### Standard Actions for Resources
- `view` - Read a single resource
- `viewAny` - List/browse resources
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `manage` - Full control (admin-level)

### Implementation Steps for New Features

1. **Define the resource** in the `resources` table
2. **Create permissions** for each action on that resource
3. **Assign permissions to roles** via `role_permissions`
4. **Use `PermissionGate`** to protect UI components
5. **Use `requirePermission`** middleware for API routes

### Performance Tips

- **Cache aggressively** - Permission checks happen frequently
- **Batch checks** when possible for bulk operations
- **Use database functions** for complex permission logic
- **Index properly** on user_id, role_id, permission lookups

## Common Pitfalls to Avoid

1. **No role hierarchy** - Don't assume role inheritance
2. **Always check tenant context** - Multi-tenant boundaries are critical
3. **Cache invalidation** - Clear cache when roles/permissions change
4. **SuperAdmin bypass** - Always check SuperAdmin status first
5. **Database security** - Use RLS policies as backup protection

## Testing Permission Implementation

```typescript
// Test permission checks
describe('Permission System', () => {
  it('should grant access to users with correct permissions', async () => {
    const userId = 'test-user-id';
    const permissionService = new PermissionService();
    
    // Mock or setup test data
    await setupUserWithRole(userId, 'editor');
    await setupRolePermission('editor', 'articles', 'create');
    
    const hasPermission = await permissionService.checkPermission(
      userId,
      'articles',
      'create'
    );
    
    expect(hasPermission).toBe(true);
  });
  
  it('should deny access to users without permissions', async () => {
    const userId = 'test-user-id';
    const permissionService = new PermissionService();
    
    const hasPermission = await permissionService.checkPermission(
      userId,
      'articles',
      'delete'
    );
    
    expect(hasPermission).toBe(false);
  });
});
```

## Key Design Principles

1. **Direct Assignment**: No role hierarchy - explicit permission grants only
2. **Tenant Isolation**: All permissions are scoped to tenant context
3. **Performance First**: Aggressive caching with proper invalidation
4. **Security by Default**: Deny by default, explicit grants required
5. **Auditability**: All permission changes are logged

## Quick Reference

- **Core Service**: `PermissionService.checkPermission()`
- **UI Protection**: `<PermissionGate resource="X" action="Y">`
- **API Protection**: `requirePermission('resource', 'action')`
- **Hook**: `usePermission('resource', 'action')`
- **Cache TTL**: 5 minutes default
- **SuperAdmin**: Always returns true for all permissions

This guide contains everything needed to implement permissions without navigating multiple complex documents. For edge cases or advanced scenarios, refer to the detailed documentation as needed.

## Related Documentation (When Needed)

Only reference these for advanced scenarios:
- **[PERMISSION_TYPES.md](docs/rbac/PERMISSION_TYPES.md)**: Detailed permission taxonomy
- **[CACHING_STRATEGY.md](docs/rbac/CACHING_STRATEGY.md)**: Advanced caching patterns
- **[ENTITY_BOUNDARIES.md](docs/rbac/ENTITY_BOUNDARIES.md)**: Multi-tenant isolation details

## Version History

- **1.0.0**: Initial AI-focused permission implementation guide (2025-05-23)
