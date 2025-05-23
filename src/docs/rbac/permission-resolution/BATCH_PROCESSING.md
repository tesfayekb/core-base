
# Batch Processing for Permissions

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details batch processing techniques that optimize permission checks by reducing database queries and network overhead.

## Batched Permission Loading

To minimize database queries, the system implements batched permission loading:

1. **Eager Loading**:
   - Load all permissions for a user in a single query
   - Cache the full permission set
   - Use for multiple permission checks in same request

2. **Permission Set Operations**:
   - Efficient set operations for permission checks
   - Avoids repeated database queries

```typescript
async function loadAllUserPermissions(userId: string, tenantId?: string): Promise<Set<string>> {
  const permissionSetKey = `permset:${userId}:${tenantId || 'global'}`;
  
  // Check cache first
  const cachedPermissions = permissionSetCache.get(permissionSetKey);
  if (cachedPermissions) {
    return cachedPermissions;
  }
  
  // Load from database
  const permissions = await database.query(
    'SELECT * FROM get_user_permissions($1, $2)',
    [userId, tenantId]
  );
  
  // Format as resource:action strings
  const permissionSet = new Set<string>(
    permissions.map(p => `${p.resource_name}:${p.action_name}`)
  );
  
  // Cache permission set
  permissionSetCache.set(permissionSetKey, permissionSet);
  
  return permissionSet;
}
```

## Batch Database Operations

The system optimizes database operations with batch techniques:

1. **Grouped Write Operations**:
   - Batch inserts for role assignments
   - Batch updates for permission changes
   - Transaction-based processing for consistency

2. **Bulk Permission Checks**:
   - Single query for multiple permission checks
   - Array-based parameter passing
   - Result set processing

```sql
-- Function to check multiple permissions in one query
CREATE OR REPLACE FUNCTION check_multiple_permissions(
  p_user_id UUID,
  p_checks JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '{}'::JSONB;
  v_check JSONB;
BEGIN
  FOR v_check IN SELECT jsonb_array_elements(p_checks)
  LOOP
    v_result := v_result || jsonb_build_object(
      v_check->>'id',
      check_permission(
        p_user_id,
        v_check->>'action',
        v_check->>'resource'
      )
    );
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Frontend Batch Operations

The frontend implements batch permission checking:

```typescript
function useMultiplePermissions(
  checks: Array<{ resource: string, action: string, id: string }>
): Record<string, boolean> {
  const { userId } = useAuthContext();
  const queryKey = `batch:${userId}:${JSON.stringify(checks)}`;
  
  const { data } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const result = await api.permissions.checkMultiple({
        checks
      });
      return result.permissions;
    },
    staleTime: 60 * 1000 // 1 minute
  });
  
  return data || {};
}
```

## Permission Decision Tree

For efficient batch permission resolution, the system implements a decision tree:

```typescript
class PermissionNode {
  resource: string | null;
  action: string | null;
  result: boolean | null;
  children: Map<string, PermissionNode>;
  
  constructor(resource: string | null = null, action: string | null = null) {
    this.resource = resource;
    this.action = action;
    this.result = null; // Terminal nodes have boolean results
    this.children = new Map<string, PermissionNode>();
  }
  
  addPath(resourcePath: string[], actionPath: string[], result: boolean): void {
    if (resourcePath.length === 0 && actionPath.length === 0) {
      this.result = result;
      return;
    }
    
    const currentResource = resourcePath.length > 0 ? resourcePath[0] : null;
    const currentAction = actionPath.length > 0 ? actionPath[0] : null;
    const key = `${currentResource || '*'}:${currentAction || '*'}`;
    
    if (!this.children.has(key)) {
      this.children.set(key, new PermissionNode(currentResource, currentAction));
    }
    
    const nextResourcePath = resourcePath.length > 0 ? resourcePath.slice(1) : [];
    const nextActionPath = actionPath.length > 0 ? actionPath.slice(1) : [];
    
    this.children.get(key)?.addPath(nextResourcePath, nextActionPath, result);
  }
  
  evaluate(resourcePath: string[], actionPath: string[]): boolean | null {
    if (resourcePath.length === 0 && actionPath.length === 0) {
      return this.result;
    }
    
    const currentResource = resourcePath.length > 0 ? resourcePath[0] : null;
    const currentAction = actionPath.length > 0 ? actionPath[0] : null;
    
    // Try exact match first
    const exactKey = `${currentResource}:${currentAction}`;
    if (this.children.has(exactKey)) {
      const result = this.children.get(exactKey)?.evaluate(
        resourcePath.slice(1), 
        actionPath.slice(1)
      );
      if (result !== null) return result;
    }
    
    // Try resource-wildcard match
    const resourceWildcardKey = `*:${currentAction}`;
    if (this.children.has(resourceWildcardKey)) {
      const result = this.children.get(resourceWildcardKey)?.evaluate(
        resourcePath.slice(1), 
        actionPath.slice(1)
      );
      if (result !== null) return result;
    }
    
    // Try action-wildcard match
    const actionWildcardKey = `${currentResource}:*`;
    if (this.children.has(actionWildcardKey)) {
      const result = this.children.get(actionWildcardKey)?.evaluate(
        resourcePath.slice(1), 
        actionPath.slice(1)
      );
      if (result !== null) return result;
    }
    
    // Try full wildcard match
    const fullWildcardKey = `*:*`;
    if (this.children.has(fullWildcardKey)) {
      const result = this.children.get(fullWildcardKey)?.evaluate(
        resourcePath.slice(1), 
        actionPath.slice(1)
      );
      if (result !== null) return result;
    }
    
    return null; // No decision possible
  }
}
```

## Related Documentation

- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)**: Overview of performance optimization
- **[CACHING.md](CACHING.md)**: Permission caching strategies
- **[MEMORY_MANAGEMENT.md](MEMORY_MANAGEMENT.md)**: Memory footprint optimization
- **[DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md)**: Database-level optimizations

## Version History

- **1.0.0**: Initial document created from PERFORMANCE_OPTIMIZATION.md refactoring (2025-05-23)
