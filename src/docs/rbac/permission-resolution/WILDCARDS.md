
# Permission Wildcards

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the implementation of permission wildcards, which allow for more flexible permission management through pattern matching.

## Wildcard Types

The system supports several types of wildcards:

1. **Resource Wildcards** (`*:action`): Apply to all resource types
2. **Action Wildcards** (`resource:*`): Apply to all actions on a resource
3. **Global Wildcards** (`*:*`): Apply to all resources and actions (SuperAdmin only)

## Implementation Architecture

```typescript
// Wildcard permission check implementation
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

## Database Implementation

The database implementation includes specialized functions for wildcard permissions:

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

## Wildcard Permission Format

Wildcard permissions follow this format:

```
<resource-type>:<action>
```

Where:
- `<resource-type>` can be a specific resource type or `*` for all resources
- `<action>` can be a specific action or `*` for all actions

Examples:
- `users:*` - All actions on users
- `*:view` - View action on all resources
- `*:*` - All actions on all resources (SuperAdmin only)

## Security Considerations

Wildcards introduce broader permissions and require careful management:

1. **Principle of Least Privilege**: Use wildcards sparingly
2. **SuperAdmin Controls**: Global wildcards (`*:*`) should be restricted to SuperAdmin roles
3. **Audit Logging**: Additional logging for wildcard permission grants
4. **Permission Review**: Regular review process for wildcard permissions

## Frontend Integration

```typescript
function useWildcardPermission(
  resourceType: string, 
  action: string
): boolean {
  const { userPermissions } = usePermissionContext();
  
  // Check with wildcard support
  return (
    userPermissions.includes(`${resourceType}:${action}`) || // Exact match
    userPermissions.includes(`*:${action}`) || // Resource wildcard
    userPermissions.includes(`${resourceType}:*`) || // Action wildcard
    userPermissions.includes('*:*') // Global wildcard
  );
}
```

## Related Documentation

- **[SPECIAL_CASES.md](SPECIAL_CASES.md)**: Overview of special permission cases
- **[DATABASE_QUERIES.md](DATABASE_QUERIES.md)**: SQL implementation
- **[PERMISSION_MODEL.md](PERMISSION_MODEL.md)**: Core permission model
- **[FRONTEND_IMPLEMENTATION.md](FRONTEND_IMPLEMENTATION.md)**: Frontend integration

## Version History

- **1.0.0**: Initial document created from SPECIAL_CASES.md refactoring (2025-05-23)
