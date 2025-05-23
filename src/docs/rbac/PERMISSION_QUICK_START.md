
# Permission System Quick Start

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

Get the permission system working quickly without complex details. The system uses **direct permission assignment** - no role hierarchy or inheritance.

## Quick Implementation Steps

### 1. Database Setup

```sql
-- Essential tables for permission system
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

### 2. Database Function

```sql
-- Permission check function
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT,
  p_tenant_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
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

### 3. Backend Service

```typescript
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
    
    // 3. Query database
    const { data } = await this.supabase.rpc('check_user_permission', {
      p_user_id: userId,
      p_resource: resource,
      p_action: action,
      p_tenant_id: tenantId
    });
    
    // 4. Cache and return
    await this.cache.set(cacheKey, !!data, 300); // 5 min cache
    return !!data;
  }
}
```

### 4. React Hook

```typescript
export function usePermission(
  resource: string,
  action: string
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

### 5. Permission Gate

```typescript
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
```

## Standard Actions

Use these standard actions for consistency:
- `view` - Read a single resource
- `viewAny` - List/browse resources
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `manage` - Full control (admin-level)

## Usage Examples

```typescript
// Protect UI components
<PermissionGate resource="users" action="create">
  <CreateUserButton />
</PermissionGate>

// Check permissions in code
const canEdit = usePermission('articles', 'update');

// API route protection
app.post('/api/users', requirePermission('users', 'create'), createUserHandler);
```

## Quick Testing

```typescript
// Test permission setup
describe('Permissions', () => {
  it('should work for basic permission check', async () => {
    const service = new PermissionService();
    const hasPermission = await service.checkPermission(
      'user-id',
      'users',
      'view'
    );
    expect(typeof hasPermission).toBe('boolean');
  });
});
```

## Next Steps

After getting permissions working:
- Use `PERMISSION_DETAILED_GUIDE.md` for advanced features
- Reference `PERMISSION_PATTERNS.md` for complex scenarios
- Check `../multitenancy/ADVANCED_CHECKLIST.md` for multi-tenant integration

This quick start gets permissions working in under an hour.
