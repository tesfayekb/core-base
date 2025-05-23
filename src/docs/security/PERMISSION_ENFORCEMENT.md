# Permission Enforcement Algorithms

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the specific algorithms implemented for permission checks, enforcement, and resolution.

## Permission Check Implementation

The system implements this algorithm for permission checks across all layers:

```typescript
// Permission check implementation
async function checkUserPermission(userId: string, resource: string, action: string): Promise<boolean> {
  // 1. Check cache first for performance
  const cacheKey = `perm:${userId}:${resource}:${action}`;
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult !== undefined) {
    return cachedResult === 'true';
  }
  
  // 2. Get user roles
  const userRoles = await getUserRoles(userId);
  
  // 3. SuperAdmin short-circuit
  if (userRoles.includes('super_admin')) {
    await cache.set(cacheKey, 'true', 3600); // Cache for 1 hour
    return true;
  }
  
  // 4. Basic user default permission check
  if (userRoles.includes('user')) {
    const isDefaultPermission = BASIC_USER_DEFAULT_PERMISSIONS.some(
      p => p.resource === resource && p.action === action
    );
    
    if (isDefaultPermission) {
      await cache.set(cacheKey, 'true', 3600);
      return true;
    }
  }
  
  // 5. Check role-based permissions with direct assignment model
  let hasPermission = false;
  
  for (const role of userRoles) {
    const rolePermissions = await getRolePermissions(role);
    if (rolePermissions.some(p => p.resource === resource && p.action === action)) {
      hasPermission = true;
      break;
    }
  }
  
  // 6. Audit permission check
  await auditSecurityEvent({
    type: 'authorization',
    subtype: 'permission_check',
    userId: userId,
    metadata: {
      resource,
      action,
      granted: hasPermission
    }
  });
  
  // 7. Cache result
  await cache.set(cacheKey, hasPermission ? 'true' : 'false', 3600);
  
  return hasPermission;
}
```

## API Middleware Implementation

The permission enforcement middleware for API routes:

```typescript
// Permission middleware implementation
function requirePermission(resource: string, action: string): RequestHandler {
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
      
      // 3. Check user permission
      const hasPermission = await checkUserPermission(
        req.user.id,
        resource,
        action,
        tenantId
      );
      
      if (!hasPermission) {
        // 4. Audit failed permission check
        await auditSecurityEvent({
          type: 'authorization',
          subtype: 'permission_denied',
          userId: req.user.id,
          metadata: {
            resource,
            action,
            path: req.path,
            method: req.method,
            tenantId
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
      console.error('Permission check error:', error);
      
      await auditSecurityEvent({
        type: 'error',
        subtype: 'permission_check_error',
        userId: req.user?.id,
        metadata: {
          resource,
          action,
          error: error.message
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

## UI Component Permission Check

The permission check implementation for UI components:

```typescript
// UI permission hook implementation
function usePermission(resource: string, action: string): {
  hasPermission: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const { user } = useAuth();
  const queryKey = `permission:${user?.id}:${resource}:${action}`;
  
  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      if (!user) {
        return false;
      }
      
      const result = await api.permissions.check({
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

// Conditional render component based on permission
function PermissionGate({ 
  resource, 
  action, 
  fallback = null,
  children 
}: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermission(resource, action);
  
  // During initial load, render nothing or a skeleton
  if (isLoading) {
    return <LoadingIndicator />;
  }
  
  // If permission granted, render children
  if (hasPermission) {
    return <>{children}</>;
  }
  
  // Otherwise render fallback or null
  return fallback;
}
```

## Database-Level Permission Enforcement

Row-level security implementation in the database:

```sql
-- Create permission check function for database policies
CREATE OR REPLACE FUNCTION check_permission_policy(
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
    
    -- Check cached permission using pg_cached_plan
    /*+ BitmapScan(user_permissions idx_user_permissions_resource_action) */
    RETURN EXISTS (
      SELECT 1
      FROM user_permissions
      WHERE user_id = auth_user_id
      AND resource_name = $1
      AND action_name = $2
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply row-level security policy to a table
CREATE POLICY users_access_policy ON users
  USING (
    -- For SELECTs
    check_permission_policy('users', 'view')
    OR 
    -- Allow users to see their own record regardless of permissions
    id = auth.uid()
  )
  WITH CHECK (
    -- For INSERTs and UPDATEs
    check_permission_policy('users', 'create')
    OR
    (check_permission_policy('users', 'update') 
     AND id = auth.uid())
  );
```

## Multiple Permission Check Optimization

Efficient batch checking for multiple permissions:

```typescript
// Efficient checking of multiple permissions
async function checkMultiplePermissions(
  userId: string,
  checks: Array<{ resource: string, action: string }>
): Promise<Record<string, boolean>> {
  // 1. Build permission keys
  const permissionKeys = checks.map(
    ({ resource, action }) => `${resource}:${action}`
  );
  
  // 2. Get cached results for all keys
  const cacheKeys = permissionKeys.map(key => `perm:${userId}:${key}`);
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
  
  // 6. Get user roles once
  const userRoles = await getUserRoles(userId);
  
  // 7. SuperAdmin short-circuit
  if (userRoles.includes('super_admin')) {
    // Grant all permissions and cache them
    const cacheEntries: Record<string, string> = {};
    
    missingChecks.forEach(({ resource, action }) => {
      const key = `${resource}:${action}`;
      results[key] = true;
      cacheEntries[`perm:${userId}:${key}`] = 'true';
    });
    
    await cache.mset(cacheEntries, 3600);
    return results;
  }
  
  // 8. Get all role permissions in one query
  const rolePermissions = await Promise.all(
    userRoles.map(role => getRolePermissions(role))
  );
  
  // 9. Flatten role permissions
  const flatPermissions = rolePermissions.flat();
  
  // 10. Check each missing permission
  const cacheEntries: Record<string, string> = {};
  
  for (const { resource, action } of missingChecks) {
    const key = `${resource}:${action}`;
    const hasPermission = flatPermissions.some(
      p => p.resource === resource && p.action === action
    );
    
    results[key] = hasPermission;
    cacheEntries[`perm:${userId}:${key}`] = hasPermission ? 'true' : 'false';
  }
  
  // 11. Cache results
  await cache.mset(cacheEntries, 3600);
  
  return results;
}
```

## Related Documentation

- **[OVERVIEW.md](OVERVIEW.md)**: Security implementation overview
- **[AUTH_ALGORITHMS.md](AUTH_ALGORITHMS.md)**: Authentication algorithms
- **[../rbac/permission-resolution/CORE_ALGORITHM.md](../rbac/permission-resolution/CORE_ALGORITHM.md)**: Core permission resolution
- **[../rbac/permission-resolution/PERFORMANCE_OPTIMIZATION.md](../rbac/permission-resolution/PERFORMANCE_OPTIMIZATION.md)**: Performance optimization
- **[../rbac/PERMISSION_IMPLEMENTATION_GUIDE.md](../rbac/PERMISSION_IMPLEMENTATION_GUIDE.md)**: Implementation guide

## Version History

- **1.0.0**: Initial document created from OVERVIEW.md refactoring (2025-05-23)
