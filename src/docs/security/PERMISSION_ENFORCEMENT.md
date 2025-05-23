# Permission Enforcement Algorithms

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the specific algorithms implemented for permission checks, enforcement, and resolution using the direct permission assignment model.

## Direct Permission Check Implementation

The system implements this algorithm for direct permission checks across all layers:

```typescript
// Direct permission check implementation
async function checkDirectUserPermission(userId: string, resource: string, action: string): Promise<boolean> {
  // 1. Check cache first for performance
  const cacheKey = `direct_perm:${userId}:${resource}:${action}`;
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult !== undefined) {
    return cachedResult === 'true';
  }
  
  // 2. Get user's directly assigned roles
  const userDirectRoles = await getUserDirectRoles(userId);
  
  // 3. SuperAdmin short-circuit
  if (userDirectRoles.some(role => role.name === 'SuperAdmin')) {
    await cache.set(cacheKey, 'true', 3600);
    return true;
  }
  
  // 4. Basic user default permission check
  if (userDirectRoles.some(role => role.name === 'BasicUser')) {
    const isDefaultPermission = BASIC_USER_DEFAULT_PERMISSIONS.some(
      p => p.resource === resource && p.action === action
    );
    
    if (isDefaultPermission) {
      await cache.set(cacheKey, 'true', 3600);
      return true;
    }
  }
  
  // 5. Check direct role-based permissions (union approach)
  let hasPermission = false;
  
  for (const role of userDirectRoles) {
    const directRolePermissions = await getDirectRolePermissions(role.id);
    if (directRolePermissions.some(p => p.resource === resource && p.action === action)) {
      hasPermission = true;
      break;
    }
  }
  
  // 6. Audit permission check
  await auditSecurityEvent({
    type: 'authorization',
    subtype: 'direct_permission_check',
    userId: userId,
    metadata: {
      resource,
      action,
      granted: hasPermission,
      model: 'direct_assignment'
    }
  });
  
  // 7. Cache result
  await cache.set(cacheKey, hasPermission ? 'true' : 'false', 3600);
  
  return hasPermission;
}
```

## API Middleware Implementation

The direct permission enforcement middleware for API routes:

```typescript
// Direct permission middleware implementation
function requireDirectPermission(resource: string, action: string): RequestHandler {
  return async (req, res, next) => {
    try {
      // 1. Verify user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }
      
      // 2. Get tenant context if applicable
      const tenantId = req.headers['x-tenant-id'] as string || undefined;
      
      // 3. Check user direct permission
      const hasPermission = await checkDirectUserPermission(
        req.user.id,
        resource,
        action,
        tenantId
      );
      
      if (!hasPermission) {
        // 4. Audit failed permission check
        await auditSecurityEvent({
          type: 'authorization',
          subtype: 'direct_permission_denied',
          userId: req.user.id,
          metadata: {
            resource,
            action,
            path: req.path,
            method: req.method,
            tenantId,
            model: 'direct_assignment'
          }
        });
        
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You do not have permission to perform this action'
        });
      }
      
      // 5. Permission granted, proceed to handler
      next();
    } catch (error) {
      // 6. Handle unexpected errors
      console.error('Direct permission check error:', error);
      
      await auditSecurityEvent({
        type: 'error',
        subtype: 'direct_permission_check_error',
        userId: req.user?.id,
        metadata: {
          resource,
          action,
          error: error.message,
          model: 'direct_assignment'
        }
      });
      
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
}
```

## UI Component Direct Permission Check

The direct permission check implementation for UI components:

```typescript
// UI direct permission hook implementation
function useDirectPermission(resource: string, action: string): {
  hasPermission: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const { user } = useAuth();
  const queryKey = `direct_permission:${user?.id}:${resource}:${action}`;
  
  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      if (!user) {
        return false;
      }
      
      const result = await api.permissions.checkDirect({
        resource,
        action
      });
      
      return result.granted;
    },
    // Don't fetch if user isn't authenticated
    enabled: !!user,
    // Cache permission for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Return last known result while refetching
    keepPreviousData: true
  });
  
  return {
    hasPermission: !!data,
    isLoading,
    error
  };
}

// Direct permission gate component
function DirectPermissionGate({ 
  resource, 
  action, 
  fallback = null,
  children 
}: DirectPermissionGateProps) {
  const { hasPermission, isLoading } = useDirectPermission(resource, action);
  
  // During initial load, render nothing or a skeleton
  if (isLoading) {
    return <LoadingIndicator />;
  }
  
  // If direct permission granted, render children
  if (hasPermission) {
    return <>{children}</>;
  }
  
  // Otherwise render fallback or null
  return fallback;
}
```

## Database-Level Direct Permission Enforcement

Row-level security implementation with direct assignment model:

```sql
-- Create direct permission check function for database policies
CREATE OR REPLACE FUNCTION check_direct_permission_policy(
  resource_name TEXT, 
  action_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Get authenticated user from session context
  DECLARE
    auth_user_id UUID;
  BEGIN
    auth_user_id := auth.uid();
    IF auth_user_id IS NULL THEN
      RETURN FALSE;
    END IF;
    
    -- SuperAdmin short-circuit
    IF is_super_admin(auth_user_id) THEN
      RETURN TRUE;
    END IF;
    
    -- Check direct permission assignment (no hierarchy)
    RETURN EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN resources r ON p.resource_id = r.id
      WHERE ur.user_id = auth_user_id
      AND r.name = resource_name
      AND p.action = action_name
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Multiple Direct Permission Check Optimization

Efficient batch checking for multiple direct permissions:

```typescript
// Efficient checking of multiple direct permissions
async function checkMultipleDirectPermissions(
  userId: string,
  checks: Array<{ resource: string, action: string }>
): Promise<Record<string, boolean>> {
  // 1. Build permission keys
  const permissionKeys = checks.map(
    ({ resource, action }) => `${resource}:${action}`
  );
  
  // 2. Get cached results for all keys
  const cacheKeys = permissionKeys.map(key => `direct_perm:${userId}:${key}`);
  const cachedResults = await cache.mget(cacheKeys);
  
  // 3. Track which permissions need to be checked
  const missingChecks: Array<{ resource: string, action: string, index: number }> = [];
  const results: Record<string, boolean> = {};
  
  // 4. Process cached results
  cachedResults.forEach((result, i) => {
    if (result !== undefined) {
      const { resource, action } = checks[i];
      results[`${resource}:${action}`] = result === 'true';
    } else {
      missingChecks.push({ ...checks[i], index: i });
    }
  });
  
  // 5. If all permissions were in cache, return results
  if (missingChecks.length === 0) {
    return results;
  }
  
  // 6. Get user's directly assigned roles once
  const userDirectRoles = await getUserDirectRoles(userId);
  
  // 7. SuperAdmin short-circuit
  if (userDirectRoles.some(role => role.name === 'SuperAdmin')) {
    // Grant all permissions and cache them
    const cacheEntries: Record<string, string> = {};
    
    missingChecks.forEach(({ resource, action }) => {
      const key = `${resource}:${action}`;
      results[key] = true;
      cacheEntries[`direct_perm:${userId}:${key}`] = 'true';
    });
    
    await cache.mset(cacheEntries, 3600);
    return results;
  }
  
  // 8. Get all direct role permissions in one query
  const directRolePermissions = await Promise.all(
    userDirectRoles.map(role => getDirectRolePermissions(role.id))
  );
  
  // 9. Flatten direct role permissions
  const flatPermissions = directRolePermissions.flat();
  
  // 10. Check each missing permission
  const cacheEntries: Record<string, string> = {};
  
  for (const { resource, action } of missingChecks) {
    const key = `${resource}:${action}`;
    const hasPermission = flatPermissions.some(
      p => p.resource === resource && p.action === action
    );
    
    results[key] = hasPermission;
    cacheEntries[`direct_perm:${userId}:${key}`] = hasPermission ? 'true' : 'false';
  }
  
  // 11. Cache results
  await cache.mset(cacheEntries, 3600);
  
  return results;
}
```

## Related Documentation

- **[OVERVIEW.md](OVERVIEW.md)**: Security implementation overview
- **[AUTH_ALGORITHMS.md](AUTH_ALGORITHMS.md)**: Authentication algorithms
- **[../rbac/permission-resolution/CORE_ALGORITHM.md](../rbac/permission-resolution/CORE_ALGORITHM.md)**: Core direct permission resolution
- **[../rbac/permission-resolution/PERFORMANCE_OPTIMIZATION.md](../rbac/permission-resolution/PERFORMANCE_OPTIMIZATION.md)**: Performance optimization
- **[../rbac/PERMISSION_IMPLEMENTATION_GUIDE.md](../rbac/PERMISSION_IMPLEMENTATION_GUIDE.md)**: Implementation guide

## Version History

- **1.1.0**: Updated to align with direct permission assignment model (2025-05-23)
- **1.0.0**: Initial document created from OVERVIEW.md refactoring (2025-05-23)
