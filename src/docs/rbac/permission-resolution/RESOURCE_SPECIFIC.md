
# Resource-Specific Permissions

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the implementation of resource-specific permissions, which allow permissions to be granted for individual resource instances rather than entire resource types.

## Implementation Architecture

Resource-specific permissions extend the standard permission model by adding a resource instance ID dimension:

```typescript
async function resolveResourceSpecificPermission(
  userId: string,
  actionKey: string,
  resourceType: string,
  specificResourceId: string,
  tenantId?: string
): Promise<boolean> {
  // First check general permission (may be sufficient)
  const hasGeneralPermission = await resolvePermission(
    userId, 
    actionKey, 
    resourceType,
    undefined,
    tenantId
  );
  
  if (hasGeneralPermission) {
    return true;
  }
  
  // If no general permission, check resource-specific permission
  // This is only implemented for certain resource types
  if (!supportsResourceSpecificPermissions(resourceType)) {
    return false;
  }
  
  // Implementation of resource-specific permission check
  // ...
}
```

## Database Schema Extension

Resource-specific permissions require additional database tables:

```sql
-- Resource-specific permissions table
CREATE TABLE resource_specific_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  resource_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(permission_id, resource_id)
);

-- Index for efficient lookups
CREATE INDEX idx_resource_specific_permissions_resource_id
ON resource_specific_permissions(resource_id);

CREATE INDEX idx_resource_specific_permissions_permission_id
ON resource_specific_permissions(permission_id);
```

## Database Implementation

The database implementation includes specialized functions for resource-specific permission checks:

```sql
-- Function to check resource-specific permissions
CREATE OR REPLACE FUNCTION check_resource_specific_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_specific_resource_id UUID,
  p_tenant_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_tenant_id UUID;
  v_resource_type_id UUID;
BEGIN
  -- Get tenant context
  v_tenant_id := COALESCE(p_tenant_id, get_user_current_tenant(p_user_id));
  
  -- Get resource type ID
  SELECT id INTO v_resource_type_id 
  FROM resources 
  WHERE name = p_resource_type;
  
  -- Check for specific resource permission
  SELECT EXISTS (
    SELECT 1
    FROM resource_specific_permissions rsp
    JOIN role_permissions rp ON rsp.permission_id = rp.permission_id
    JOIN permissions p ON p.id = rp.permission_id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id
    AND p.resource_id = v_resource_type_id
    AND p.action = p_action
    AND rsp.resource_id = p_specific_resource_id
    
    UNION
    
    -- Tenant-specific resource permissions
    SELECT 1
    FROM resource_specific_permissions rsp
    JOIN role_permissions rp ON rsp.permission_id = rp.permission_id
    JOIN permissions p ON p.id = rp.permission_id
    JOIN user_tenants ut ON ut.role_id = rp.role_id
    WHERE ut.user_id = p_user_id
    AND ut.tenant_id = v_tenant_id
    AND p.resource_id = v_resource_type_id
    AND p.action = p_action
    AND rsp.resource_id = p_specific_resource_id
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Frontend Integration

Frontend components can leverage resource-specific permissions with a specialized hook:

```typescript
function useResourceSpecificPermission(
  resourceType: string, 
  resourceId: string, 
  action: string
): boolean {
  const { userId, tenantId } = useAuthContext();
  const queryKey = `permission:${userId}:${tenantId}:${resourceType}:${resourceId}:${action}`;
  
  const { data: hasPermission } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const result = await api.permissions.checkResourceSpecific({
        resourceType,
        resourceId,
        action
      });
      return result.granted;
    },
    staleTime: 60 * 1000 // 1 minute
  });
  
  return hasPermission || false;
}
```

## Related Documentation

- **[SPECIAL_CASES.md](SPECIAL_CASES.md)**: Overview of special permission cases
- **[DATABASE_QUERIES.md](DATABASE_QUERIES.md)**: SQL implementation
- **[PERMISSION_MODEL.md](PERMISSION_MODEL.md)**: Core permission model
- **[FRONTEND_IMPLEMENTATION.md](FRONTEND_IMPLEMENTATION.md)**: Frontend integration

## Version History

- **1.0.0**: Initial document created from SPECIAL_CASES.md refactoring (2025-05-23)
