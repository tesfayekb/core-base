
# Permission Resolution Special Cases

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details special permission resolution cases that require additional handling beyond the standard algorithm, including resource-specific permissions and permission wildcards.

## Resource-Specific Permissions

Some permissions apply to specific resources rather than resource types:

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

### Resource-Specific Permission Database Query

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

## Permission Wildcards

For specialized cases, permission wildcards can be used:

```typescript
// Example wildcard resolution (used rarely in specific contexts)
function checkWildcardPermission(
  requiredPermission: string,
  userPermissions: string[]
): boolean {
  // Exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  // Wildcard matches
  // Format: "resource:*" or "*:action"
  const [resourceType, action] = requiredPermission.split(':');
  
  // Resource wildcard
  if (userPermissions.includes(`*:${action}`)) {
    return true;
  }
  
  // Action wildcard
  if (userPermissions.includes(`${resourceType}:*`)) {
    return true;
  }
  
  // Global wildcard (SuperAdmin only)
  if (userPermissions.includes('*:*')) {
    return true;
  }
  
  return false;
}
```

### Wildcard Database Implementation

```sql
-- Function to check permissions with wildcard support
CREATE OR REPLACE FUNCTION check_wildcard_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_permissions up
    WHERE up.user_id = p_user_id
    AND (
      -- Exact match
      (up.resource_name = p_resource_type AND up.action_name = p_action)
      -- Resource wildcard
      OR (up.resource_name = '*' AND up.action_name = p_action)
      -- Action wildcard
      OR (up.resource_name = p_resource_type AND up.action_name = '*')
      -- Global wildcard
      OR (up.resource_name = '*' AND up.action_name = '*')
    )
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Owner-Based Permissions

Special permissions based on resource ownership:

```typescript
async function checkOwnerPermission(
  userId: string,
  actionKey: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  // 1. Check if resource type supports ownership
  if (!supportsOwnership(resourceType)) {
    return false;
  }
  
  // 2. Check if user is the owner of the resource
  const isOwner = await isResourceOwner(userId, resourceType, resourceId);
  if (!isOwner) {
    return false;
  }
  
  // 3. Check if the action is allowed for owners
  return isActionAllowedForOwners(resourceType, actionKey);
}
```

## Hierarchical Resource Permissions

Some resource types have hierarchical permission inheritance:

```typescript
async function checkHierarchicalPermission(
  userId: string,
  actionKey: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  // Check direct permission first
  const hasDirectPermission = await resolveResourceSpecificPermission(
    userId, actionKey, resourceType, resourceId
  );
  
  if (hasDirectPermission) {
    return true;
  }
  
  // If resource supports hierarchy, check parent resources
  if (!supportsHierarchy(resourceType)) {
    return false;
  }
  
  // Get parent resource
  const parentResource = await getParentResource(resourceType, resourceId);
  if (!parentResource) {
    return false;
  }
  
  // Recursively check permission on parent
  return checkHierarchicalPermission(
    userId,
    actionKey,
    parentResource.type,
    parentResource.id
  );
}
```

## Related Documentation

- **[RESOLUTION_ALGORITHM.md](RESOLUTION_ALGORITHM.md)**: Overview of resolution process
- **[CORE_ALGORITHM.md](CORE_ALGORITHM.md)**: Core algorithm pseudocode
- **[DATABASE_QUERIES.md](DATABASE_QUERIES.md)**: SQL implementation
- **[PERMISSION_MODEL.md](PERMISSION_MODEL.md)**: Core permission model
- **[ENTITY_BOUNDARIES.md](ENTITY_BOUNDARIES.md)**: Entity-level permission boundaries

## Version History

- **1.0.0**: Initial document created from RESOLUTION_ALGORITHM.md refactoring (2025-05-23)
