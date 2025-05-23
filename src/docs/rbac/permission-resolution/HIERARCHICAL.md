
# Hierarchical Resource Permissions

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the implementation of hierarchical resource permissions, which allow permissions to be inherited based on resource hierarchies.

## Hierarchical Permission Model

The hierarchical permission model allows permissions to flow from parent resources to child resources:

1. **Resource Hierarchy**: Parent-child relationships between resources
2. **Permission Inheritance**: Permissions granted on parent apply to children
3. **Hierarchy Traversal**: Algorithm to walk up the resource hierarchy

## Implementation Architecture

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

## Database Schema Extension

Hierarchical permissions require additional database tables:

```sql
-- Resource hierarchy table
CREATE TABLE resource_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_type TEXT NOT NULL,
  child_id UUID NOT NULL,
  parent_type TEXT NOT NULL,
  parent_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(child_type, child_id)
);

-- Resource types supporting hierarchical permissions
CREATE TABLE hierarchical_resource_types (
  resource_type TEXT PRIMARY KEY,
  inherits_permissions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX idx_resource_hierarchy_child ON resource_hierarchy(child_type, child_id);
CREATE INDEX idx_resource_hierarchy_parent ON resource_hierarchy(parent_type, parent_id);
```

## Database Implementation

```sql
-- Function to get parent resource
CREATE OR REPLACE FUNCTION get_parent_resource(
  p_child_type TEXT,
  p_child_id UUID
) RETURNS TABLE (
  parent_type TEXT,
  parent_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rh.parent_type,
    rh.parent_id
  FROM 
    resource_hierarchy rh
  WHERE 
    rh.child_type = p_child_type
    AND rh.child_id = p_child_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if resource type supports hierarchy
CREATE OR REPLACE FUNCTION supports_hierarchy(
  p_resource_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM hierarchical_resource_types
    WHERE resource_type = p_resource_type
    AND inherits_permissions = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check hierarchical permission
CREATE OR REPLACE FUNCTION check_hierarchical_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_max_depth INT DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_parent_type TEXT;
  v_parent_id UUID;
  v_current_depth INT := 0;
BEGIN
  -- Check direct permission first
  SELECT check_resource_specific_permission(
    p_user_id, p_action, p_resource_type, p_resource_id
  ) INTO v_has_permission;
  
  IF v_has_permission OR v_current_depth >= p_max_depth THEN
    RETURN v_has_permission;
  END IF;
  
  -- Check if resource type supports hierarchy
  IF NOT supports_hierarchy(p_resource_type) THEN
    RETURN false;
  END IF;
  
  -- Get parent resource
  SELECT parent_type, parent_id 
  FROM get_parent_resource(p_resource_type, p_resource_id)
  INTO v_parent_type, v_parent_id;
  
  IF v_parent_type IS NULL THEN
    RETURN false;
  END IF;
  
  -- Recursively check permission on parent
  RETURN check_hierarchical_permission(
    p_user_id,
    p_action,
    v_parent_type,
    v_parent_id,
    p_max_depth + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Frontend Integration

```typescript
function useHierarchicalPermission(
  resourceType: string, 
  resourceId: string, 
  action: string
): boolean {
  const { userId } = useAuthContext();
  const queryKey = `hierarchy:${userId}:${resourceType}:${resourceId}:${action}`;
  
  const { data: hasPermission } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const result = await api.permissions.checkHierarchicalPermission({
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
