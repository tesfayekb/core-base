
# Permission Query Optimization

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document provides guidance for optimizing permission-related database queries, ensuring the permission system remains performant as the application scales with increasing users, roles, and permissions.

## Performance Challenges

Permission checks present unique scaling challenges:

1. **Query Frequency**: Permission checks occur on nearly every user action
2. **Query Complexity**: Permission resolution often requires joining multiple tables
3. **Query Volume**: Systems with many users generate continuous permission verification
4. **Query Patterns**: Repetitive permission checks for common operations

## Core Optimization Strategies

### Query Pattern Optimization

1. **Denormalized Permission Tables**:
   - Create denormalized tables with pre-computed permissions
   - Update through triggers when role assignments change
   - Query these tables directly for common permission checks

```sql
-- Denormalized user permissions example
CREATE TABLE user_effective_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  action TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, resource_name, action)
);

-- Create indexes for fast lookups
CREATE INDEX idx_user_permissions_lookup ON user_effective_permissions (user_id, resource_name, action);
```

2. **Optimized Join Strategies**:
   - Minimize multi-table joins for permission checks
   - Use indexed foreign keys for role-permission relationships
   - Prefer EXISTS subqueries over multi-way joins

```sql
-- Efficient permission check using EXISTS
SELECT EXISTS (
  SELECT 1
  FROM user_effective_permissions
  WHERE user_id = auth.uid()
  AND resource_name = 'projects'
  AND action = 'View'
) AS has_permission;
```

3. **Bulk Permission Checks**:
   - Batch permission queries for UI components
   - Combine multiple checks into single queries
   - Return permission maps rather than individual booleans

```typescript
// Efficient batch permission check
async function checkMultiplePermissions(
  userId: string,
  checks: Array<{resource: string, action: string}>
): Promise<Record<string, boolean>> {
  // Build single optimized query returning multiple results
  const queryParams = [];
  const resourceActionPairs = [];
  
  // Build query parameters
  checks.forEach(({resource, action}, index) => {
    queryParams.push(resource, action);
    resourceActionPairs.push(`($1, $${2*index+2}, $${2*index+3})`);
  });
  
  // Execute single query for all permission checks
  const query = `
    SELECT resource_name, action, EXISTS (
      SELECT 1 FROM user_effective_permissions 
      WHERE user_id = $1 
      AND (resource_name, action) IN (${resourceActionPairs.join(', ')})
    ) AS has_permission
    FROM (VALUES ${resourceActionPairs.join(', ')}) 
    AS checks(user_id, resource_name, action);
  `;
  
  const result = await db.query(query, [userId, ...queryParams]);
  
  // Transform results to permission map
  const permissionMap: Record<string, boolean> = {};
  result.rows.forEach(row => {
    permissionMap[`${row.resource_name}:${row.action}`] = row.has_permission;
  });
  
  return permissionMap;
}
```

### Database Optimizations

1. **Indexing Strategy**:
   - Create compound indexes for permission lookup patterns
   - Use covering indexes for common permission checks
   - Implement partial indexes for frequently checked permissions

```sql
-- Compound index for permission lookups
CREATE INDEX idx_role_permissions ON role_permissions (role_id, permission_id);

-- Covering index that includes all needed data
CREATE INDEX idx_permissions_lookup 
ON permissions (resource_id, action)
INCLUDE (id);

-- Partial index for common 'View' operations
CREATE INDEX idx_view_permissions 
ON permissions (resource_id) 
WHERE action = 'View';
```

2. **Materialized Views**:
   - Create materialized views for complex permission relationships
   - Refresh views on role/permission changes
   - Index materialized views for quick lookups

```sql
-- Create materialized view of user permissions
CREATE MATERIALIZED VIEW user_permission_summary AS
SELECT 
  ur.user_id,
  r.name AS resource_name,
  p.action,
  TRUE AS granted
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN resources r ON p.resource_id = r.id;

-- Index the materialized view
CREATE INDEX idx_user_permission_summary 
ON user_permission_summary (user_id, resource_name, action);

-- Function to refresh the view
CREATE OR REPLACE FUNCTION refresh_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_permission_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

3. **Caching Layers**:
   - Implement database-level statement caching
   - Use prepared statements for common permission checks
   - Configure connection pooling to maintain prepared statements

```sql
-- Example of a prepared statement for permission checks
PREPARE check_user_permission(UUID, TEXT, TEXT) AS
SELECT EXISTS (
  SELECT 1 
  FROM user_effective_permissions
  WHERE user_id = $1 
  AND resource_name = $2 
  AND action = $3
);

-- Usage
EXECUTE check_user_permission('user-uuid', 'projects', 'View');
```

### Application-Level Optimizations

1. **Multi-Level Permission Caching**:
   - Session-level permission cache
   - Request-level permission cache
   - User-level permission prefetch

```typescript
// Session-level permission cache implementation
class PermissionCacheManager {
  private cache: Map<string, {
    permissions: Set<string>,
    expiresAt: number
  }> = new Map();
  
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minute cache
  
  // Get permissions from cache or database
  async getPermissions(
    userId: string, 
    tenantId: string
  ): Promise<Set<string>> {
    const cacheKey = `${userId}:${tenantId}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached permissions if valid
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }
    
    // Load permissions from database
    const permissions = await this.loadUserPermissions(userId, tenantId);
    
    // Cache the loaded permissions
    this.cache.set(cacheKey, {
      permissions,
      expiresAt: Date.now() + this.TTL_MS
    });
    
    return permissions;
  }
  
  // Invalidate cache entries when permissions change
  invalidateCache(userId: string, tenantId?: string): void {
    if (tenantId) {
      // Invalidate specific tenant permissions
      this.cache.delete(`${userId}:${tenantId}`);
    } else {
      // Invalidate all tenant permissions for user
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }
  
  // Load full user permissions from database
  private async loadUserPermissions(
    userId: string, 
    tenantId: string
  ): Promise<Set<string>> {
    // Optimized database query to load all user permissions at once
    const query = `
      SELECT resource_name, action
      FROM user_permission_summary
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    
    // Convert to permission string set format: "resource:action"
    return new Set(
      result.rows.map(row => `${row.resource_name}:${row.action}`)
    );
  }
}
```

2. **Permission Prefetching**:
   - Load all permissions at session start
   - Prefetch permissions needed for UI rendering
   - Update cache on role/permission changes

```typescript
// Permission prefetching example
async function prefetchUserPermissions(userId: string, tenantId: string) {
  // Single query to prefetch all permissions the user might need
  const query = `
    WITH user_perms AS (
      -- User's direct role permissions
      SELECT r.name AS resource_name, p.action
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN resources r ON p.resource_id = r.id
      WHERE ur.user_id = $1
      
      UNION
      
      -- User's tenant role permissions
      SELECT r.name AS resource_name, p.action
      FROM user_tenants ut
      JOIN role_permissions rp ON ut.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN resources r ON p.resource_id = r.id
      WHERE ut.user_id = $1 
      AND ut.tenant_id = $2
      AND ut.is_active = true
    )
    SELECT resource_name, action FROM user_perms
  `;
  
  const result = await db.query(query, [userId, tenantId]);
  
  // Process and cache permissions
  const permissionSet = new Set<string>();
  result.rows.forEach(row => {
    permissionSet.add(`${row.resource_name}:${row.action}`);
  });
  
  // Store in cache
  permissionCache.setPermissions(userId, tenantId, permissionSet);
  
  return permissionSet;
}
```

3. **Permission Result Reuse**:
   - Share permission results between components
   - Implement permission hooks with result memoization
   - Use context providers for permission state

```tsx
// React hook for efficient permission checking with result sharing
function usePermissions(checks: PermissionCheck[]) {
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  
  const userId = useUserId();
  const tenantId = useCurrentTenant();
  
  // Generate stable check key for memoization
  const checkKey = useMemo(() => {
    return JSON.stringify(checks.map(c => 
      `${c.resource}:${c.action}`
    ).sort());
  }, [checks]);
  
  // Fetch and memoize permission results
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    // Check permissions in batch
    permissionService
      .checkMultiplePermissions(userId, tenantId, checks)
      .then(results => {
        if (mounted) {
          setResults(results);
          setLoading(false);
        }
      });
    
    return () => { mounted = false; };
  }, [userId, tenantId, checkKey]);
  
  return { results, loading };
}
```

## Testing and Benchmarking

1. **Permission Query Benchmarking**:
   - Measure common permission check performance
   - Test with various data scales (10, 100, 1000+ roles)
   - Identify performance bottlenecks

2. **Load Testing Permission Checks**:
   - Simulate high-volume permission requests
   - Measure system performance under load
   - Test caching effectiveness

## Implementation Recommendations

1. **Progressive Optimization**:
   - Start with well-indexed basic schema
   - Implement caching for high-frequency checks
   - Add denormalized tables for critical paths
   - Use materialized views for complex permission relationships

2. **Optimization Metrics**:
   - Target sub-5ms permission check response time
   - Minimize database round-trips for UI rendering
   - Keep permission cache hit rate above 95%
   - Maintain acceptable performance with 1000+ roles

3. **Monitoring Performance**:
   - Track slow permission queries
   - Monitor cache hit/miss rates
   - Identify frequently checked permissions for optimization

## Related Documentation

- **[DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md)**: Comprehensive database optimization techniques
- **[CACHING_STRATEGY.md](CACHING_STRATEGY.md)**: Multi-level permission caching approach
- **[PERMISSION_RESOLUTION.md](PERMISSION_RESOLUTION.md)**: Permission resolution algorithm
- **[permission-resolution/RESOLUTION_ALGORITHM.md](permission-resolution/RESOLUTION_ALGORITHM.md)**: Detailed permission resolution algorithm
- **[../data-model/entity-relationships/QUERY_PATTERNS.md](../data-model/entity-relationships/QUERY_PATTERNS.md)**: Standard query patterns

## Version History

- **1.0.0**: Initial document creation focused on permission query optimization (2025-05-22)

