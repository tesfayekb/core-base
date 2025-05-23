
# Direct Permission Assignment Implementation

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the implementation of direct permission assignment within the RBAC system, replacing the previous hierarchical approach with a flat permission model.

## Direct Permission Assignment Model

The RBAC system uses a **direct permission assignment model** with these characteristics:

1. **Flat Permission Structure**: Permissions are directly assigned to roles without hierarchical inheritance
2. **Union-Based Resolution**: Users with multiple roles have the union of all permissions from their roles
3. **Explicit Permissions**: All permissions must be explicitly granted to roles

## Implementation Architecture

```typescript
async function checkDirectPermission(
  userId: string,
  actionKey: string,
  resourceType: string,
  resourceId?: string
): Promise<boolean> {
  // Check SuperAdmin first (bypass for system admins)
  if (await isSuperAdmin(userId)) {
    return true;
  }
  
  // Get all roles directly assigned to user
  const userRoles = await getUserRoles(userId);
  
  if (userRoles.length === 0) {
    return false;
  }
  
  // Check if any role has the required permission (union approach)
  return await checkRolesForDirectPermission(
    userRoles,
    actionKey,
    resourceType,
    resourceId
  );
}
```

## Database Schema for Direct Assignment

Direct permissions require a simplified database structure:

```sql
-- Roles table (flat structure)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Direct role-permission assignments
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User-role assignments (direct, no hierarchy)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role_id)
);

-- Indexes for direct permission resolution
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
```

## Database Implementation

```sql
-- Function to check direct permission assignment
CREATE OR REPLACE FUNCTION check_direct_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- SuperAdmin bypass
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;
  
  -- Check direct role permissions (union of all user's roles)
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    JOIN resources r ON p.resource_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = p_resource_type
    AND p.action = p_action
    AND (p_resource_id IS NULL OR p.resource_id = p_resource_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Frontend Integration

```typescript
function useDirectPermission(
  resourceType: string, 
  action: string,
  resourceId?: string
): boolean {
  const { userId } = useAuthContext();
  const queryKey = `direct:${userId}:${resourceType}:${action}:${resourceId || 'any'}`;
  
  const { data: hasPermission } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const result = await api.permissions.checkDirectPermission({
        resourceType,
        action,
        resourceId
      });
      return result.granted;
    },
    staleTime: 60 * 1000 // 1 minute
  });
  
  return hasPermission || false;
}
```

## Permission Resolution Logic

The direct assignment model follows this resolution logic:

1. **SuperAdmin Check**: SuperAdmins have all permissions (system bypass)
2. **Role Collection**: Get all roles directly assigned to user
3. **Permission Union**: Collect all permissions from all user's roles
4. **Direct Match**: Check if requested permission exists in the union
5. **Result**: Return boolean result with no inheritance calculations

## Related Documentation

- **[PERMISSION_MODEL.md](PERMISSION_MODEL.md)**: Core permission model details
- **[DATABASE_QUERIES.md](DATABASE_QUERIES.md)**: SQL implementation
- **[FRONTEND_IMPLEMENTATION.md](FRONTEND_IMPLEMENTATION.md)**: Frontend integration
- **[../ROLE_ARCHITECTURE.md](../ROLE_ARCHITECTURE.md)**: Role architecture principles

## Version History

- **2.0.0**: Complete rewrite to align with direct assignment model (2025-05-23)
- **1.0.0**: Initial hierarchical document (deprecated)
