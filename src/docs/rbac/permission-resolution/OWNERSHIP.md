
# Owner-Based Permissions

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the implementation of owner-based permissions, which allow users to have special permissions for resources they own.

## Owner Permission Model

The owner permission model extends standard permissions by:

1. **Resource Ownership**: Tracking which user owns each resource
2. **Owner-Specific Actions**: Defining actions allowed for resource owners
3. **Owner Permission Resolution**: Checking ownership during permission resolution

## Implementation Architecture

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

## Database Schema Extension

Owner-based permissions require additional database tables:

```sql
-- Resource ownership table
CREATE TABLE resource_ownership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(resource_type, resource_id)
);

-- Actions allowed for owners by resource type
CREATE TABLE owner_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(resource_type, action)
);

-- Indexes for efficient lookups
CREATE INDEX idx_resource_ownership_user_id ON resource_ownership(user_id);
CREATE INDEX idx_resource_ownership_resource ON resource_ownership(resource_type, resource_id);
CREATE INDEX idx_owner_actions_resource ON owner_actions(resource_type);
```

## Database Implementation

```sql
-- Function to check if user is the owner of a resource
CREATE OR REPLACE FUNCTION is_resource_owner(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM resource_ownership
    WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND resource_id = p_resource_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if action is allowed for owners
CREATE OR REPLACE FUNCTION is_action_allowed_for_owners(
  p_resource_type TEXT,
  p_action TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM owner_actions
    WHERE resource_type = p_resource_type
    AND action = p_action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Combined function to check owner permission
CREATE OR REPLACE FUNCTION check_owner_permission(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_action TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT 
      is_resource_owner(p_user_id, p_resource_type, p_resource_id) AND
      is_action_allowed_for_owners(p_resource_type, p_action)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Frontend Integration

```typescript
function useOwnerPermission(
  resourceType: string, 
  resourceId: string, 
  action: string
): boolean {
  const { userId } = useAuthContext();
  const queryKey = `owner:${userId}:${resourceType}:${resourceId}:${action}`;
  
  const { data: hasPermission } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const result = await api.permissions.checkOwnerPermission({
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
