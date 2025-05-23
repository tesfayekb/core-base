# Permission Database Optimization

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details database-level optimizations for the permission resolution system to ensure efficient queries and minimal database load.

## Database Optimizations

The system implements several database-level optimizations:

1. **Indexed Queries**:
   - Carefully designed indexes for permission tables
   - Covering indexes for common queries

2. **Denormalized Views**:
   - Materialized views for permission aggregation
   - Scheduled refresh based on update frequency

3. **Optimized SQL Functions**:
   - PL/pgSQL functions with execution plan optimization
   - Parameter optimization for common queries

4. **Connection Pooling**:
   - Database connection pooling for permission queries
   - Dedicated connection pools for permission subsystem

## Index Strategy

```sql
-- User roles index
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Role permissions index
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);

-- Composite indexes for common join patterns
CREATE INDEX idx_user_roles_role_permissions 
ON user_roles(user_id, role_id);

-- Covering index for permission checks
CREATE INDEX idx_permissions_resource_action 
ON permissions(resource_id, action);

-- Tenant-specific permissions index
CREATE INDEX idx_tenant_roles_user_tenant 
ON user_tenants(user_id, tenant_id);

-- B-tree indexes for equality comparisons
CREATE INDEX idx_permissions_resource_id_btree
ON permissions USING btree (resource_id);

-- Hash indexes for exact lookups
CREATE INDEX idx_roles_name_hash
ON roles USING hash (name);
```

## Materialized Views

```sql
-- Materialized view for user permissions
CREATE MATERIALIZED VIEW user_permissions_mv AS
SELECT 
  ur.user_id,
  p.resource_id,
  p.action,
  r.name AS role_name
FROM 
  user_roles ur
JOIN 
  role_permissions rp ON ur.role_id = rp.role_id
JOIN 
  permissions p ON rp.permission_id = p.id
JOIN 
  roles r ON ur.role_id = r.id
WITH DATA;

-- Create indexes on the materialized view
CREATE INDEX idx_user_permissions_mv_user_id
ON user_permissions_mv(user_id);

CREATE INDEX idx_user_permissions_mv_resource_action
ON user_permissions_mv(resource_id, action);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_permissions_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions_mv;
END;
$$ LANGUAGE plpgsql;

-- Set up regular refresh
SELECT cron.schedule('*/30 * * * *', 'SELECT refresh_user_permissions_mv()');
```

## Optimized SQL Functions

```sql
-- Optimized function for permission check
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_resource_id UUID;
BEGIN
  -- Performance optimization: Check SuperAdmin first
  IF EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.name = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Get resource id (with caching hint)
  SELECT id INTO v_resource_id
  FROM resources
  WHERE name = p_resource
  LIMIT 1;
  
  -- If resource doesn't exist, we can't have permission
  IF v_resource_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Use materialized view for performance
  SELECT EXISTS (
    SELECT 1
    FROM user_permissions_mv
    WHERE user_id = p_user_id
    AND resource_id = v_resource_id
    AND action = p_action
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
```

## Query Optimization

```sql
-- Plan-guided query hints
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_tenant_id UUID DEFAULT NULL
) RETURNS TABLE (
  resource_name TEXT,
  action_name TEXT
) AS $$
BEGIN
  -- Optimizer hint to prefer certain indexes
  /*+ IndexScan(ur idx_user_roles_user_id) HashJoin(ur rp) */
  RETURN QUERY
  SELECT 
    r.name AS resource_name,
    p.action AS action_name
  FROM 
    user_roles ur
  JOIN 
    role_permissions rp ON ur.role_id = rp.role_id
  JOIN 
    permissions p ON rp.permission_id = p.id
  JOIN 
    resources r ON p.resource_id = r.id
  WHERE 
    ur.user_id = p_user_id
  
  UNION
  
  -- Only include tenant permissions if tenant ID is provided
  SELECT 
    r.name AS resource_name,
    p.action AS action_name
  FROM 
    user_tenants ut
  JOIN 
    role_permissions rp ON ut.role_id = rp.role_id
  JOIN 
    permissions p ON rp.permission_id = p.id
  JOIN 
    resources r ON p.resource_id = r.id
  WHERE 
    ut.user_id = p_user_id
    AND ut.tenant_id = COALESCE(p_tenant_id, ut.tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add execution statistics collection
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

## Connection Management

```typescript
class PermissionDatabaseConnection {
  private pool: Pool;
  private readonly maxConnections = 10;
  private readonly idleTimeout = 10000; // 10 seconds
  private readonly connectionTimeout = 3000; // 3 seconds
  
  constructor() {
    this.pool = new Pool({
      max: this.maxConnections,
      idleTimeoutMillis: this.idleTimeout,
      connectionTimeoutMillis: this.connectionTimeout,
      application_name: 'permission_service',
      // Set statement timeout to prevent long-running queries
      statement_timeout: 5000 // 5 seconds
    });
    
    // Add monitoring
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  
  async query<T>(text: string, params: any[]): Promise<T[]> {
    // Get client from pool
    const client = await this.pool.connect();
    try {
      // Execute query with timeout
      const result = await client.query(text, params);
      return result.rows as T[];
    } finally {
      // Return client to pool
      client.release();
    }
  }
  
  async end(): Promise<void> {
    await this.pool.end();
  }
}
```

## Query Rewriting

```typescript
class PermissionQueryRewriter {
  // Rewrite permission query for optimal execution plan
  static rewriteQuery(resource: string, action: string, userId: string): string {
    // Use materialized view for common permission checks
    if (PermissionQueryRewriter.isCommonPermission(resource, action)) {
      return `
        SELECT EXISTS (
          SELECT 1 
          FROM user_permissions_mv
          WHERE user_id = '${userId}'
          AND resource_name = '${resource}'
          AND action_name = '${action}'
        )
      `;
    }
    
    // Use specialized function for uncommon checks
    return `
      SELECT check_permission('${userId}', '${action}', '${resource}')
    `;
  }
  
  // Determine if this is a commonly-checked permission
  private static isCommonPermission(resource: string, action: string): boolean {
    const commonPermissions = [
      'users:view',
      'users:create',
      'projects:view',
      'projects:update'
      // Other common permissions
    ];
    
    return commonPermissions.includes(`${resource}:${action}`);
  }
}
```

## Related Documentation

- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)**: Overview of performance optimization
- **[CACHING.md](CACHING.md)**: Permission caching strategies
- **[BATCH_PROCESSING.md](BATCH_PROCESSING.md)**: Batched permission operations
- **[MEMORY_MANAGEMENT.md](MEMORY_MANAGEMENT.md)**: Memory footprint optimization

## Version History

- **1.0.0**: Initial document created from PERFORMANCE_OPTIMIZATION.md refactoring (2025-05-23)
