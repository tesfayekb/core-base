
# Database Optimization for Permission Queries

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-20

## Overview

This document details the database design and optimization techniques implemented for efficient permission checking.

## Indexing Strategy

### Implementation

```sql
-- Compound index on role permissions
CREATE INDEX idx_role_permissions_composite ON role_permissions (role_id, permission_id);

-- Covering index for permission checks
CREATE INDEX idx_permissions_covering ON permissions (id, resource_id, action)
INCLUDE (name, description);

-- Partial index for common permission type
CREATE INDEX idx_view_permissions ON permissions (resource_id, id)
WHERE action LIKE 'View%';

-- Bitmap index for permission categories
CREATE INDEX idx_permission_action_category ON permissions USING gin (
  CASE 
    WHEN action LIKE 'View%' THEN 'view'
    WHEN action IN ('Create', 'Update') THEN 'modify'
    WHEN action LIKE 'Delete%' THEN 'delete'
    ELSE 'other'
  END
);
```

## Denormalized Permission Tables

### Design

```sql
-- Denormalized permissions table for quick lookups
CREATE TABLE user_effective_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  source_role_id UUID, -- Tracking which role granted this permission
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT uk_user_permission UNIQUE (user_id, resource_id, action)
);
```

### Maintenance Triggers

```sql
-- Trigger to maintain denormalized permissions when roles change
CREATE OR REPLACE FUNCTION update_effective_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Implementation to update user_effective_permissions when
  -- role_permissions or user_roles changes
  -- ...
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to role_permissions table
CREATE TRIGGER refresh_role_permissions_trigger
AFTER INSERT OR UPDATE OR DELETE ON role_permissions
FOR EACH ROW EXECUTE FUNCTION update_effective_permissions();

-- Apply trigger to user_roles table
CREATE TRIGGER refresh_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION update_effective_permissions();
```

## Materialized Permission Views

### Implementation

```sql
-- SQL for creating a materialized view of user permissions
CREATE MATERIALIZED VIEW user_permissions_view AS
SELECT 
  u.id AS user_id,
  r.id AS resource_id,
  r.name AS resource_name,
  p.action AS permission_action,
  TRUE AS granted
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN resources r ON p.resource_id = r.id;

-- Create indexes for fast querying
CREATE INDEX idx_user_permissions_user_id ON user_permissions_view(user_id);
CREATE INDEX idx_user_permissions_resource ON user_permissions_view(resource_name, permission_action);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_permissions_view()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions_view;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh the view on permission changes
CREATE TRIGGER refresh_user_permissions_trigger
AFTER INSERT OR UPDATE OR DELETE ON role_permissions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_user_permissions_view();
```

### Usage Example

```typescript
class MaterializedPermissionViews {
  // Selective refresh for specific users affected by a role change
  static async refreshForRole(roleId: string): Promise<void> {
    const query = `
      REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions_view_${roleId}
    `;
    await db.query(query);
  }
  
  // Selective refresh for a specific user
  static async refreshForUser(userId: string): Promise<void> {
    // Find all role-specific views that need updating
    const userRoles = await getUserRoles(userId);
    
    // Refresh each view concurrently
    await Promise.all(userRoles.map(role => 
      this.refreshForRole(role.id)
    ));
  }
  
  // Query optimized permission view
  static async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const query = `
      SELECT granted FROM user_permissions_view
      WHERE user_id = $1 AND resource_name = $2 AND permission_action = $3
      LIMIT 1
    `;
    const result = await db.query(query, [userId, resource, action]);
    return result.rows.length > 0 && result.rows[0].granted;
  }
}
```

## Prepared Statements

### Implementation

```typescript
class OptimizedPermissionQueries {
  private static preparedStatements: Record<string, any> = {};
  
  // Initialize prepared statements
  static async initialize(db: any): Promise<void> {
    this.preparedStatements.checkSinglePermission = await db.prepare(
      'permCheckSingle',
      'SELECT EXISTS(SELECT 1 FROM user_effective_permissions WHERE user_id = $1 AND resource_id = $2 AND action = $3 AND granted = TRUE) AS has_permission',
      ['uuid', 'uuid', 'varchar']
    );
    
    this.preparedStatements.checkMultiplePermissions = await db.prepare(
      'permCheckMultiple',
      'SELECT resource_id, action, granted FROM user_effective_permissions WHERE user_id = $1 AND (resource_id, action) = ANY($2)',
      ['uuid', 'record[]']
    );
    
    this.preparedStatements.getUserRoles = await db.prepare(
      'getUserRoles',
      'SELECT role_id FROM user_roles WHERE user_id = $1',
      ['uuid']
    );
    
    // Additional prepared statements...
  }
  
  // Use prepared statements for common queries
  static async checkPermission(
    userId: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    const result = await this.preparedStatements.checkSinglePermission.execute([
      userId,
      resourceId,
      action
    ]);
    
    return result.rows[0].has_permission;
  }
}
```

## Batch Permission Evaluation

### Implementation

```typescript
interface BatchPermissionCheck {
  userId: string;
  resource: string;
  action: string;
}

interface BatchPermissionResult {
  userId: string;
  resource: string;
  action: string;
  granted: boolean;
}

class BatchPermissionEvaluator {
  // Evaluate multiple permission checks in a single database query
  static async checkPermissions(checks: BatchPermissionCheck[]): Promise<BatchPermissionResult[]> {
    if (checks.length === 0) return [];
    
    // Build dynamic IN clause parameters
    const userIds = [...new Set(checks.map(c => c.userId))];
    const resources = [...new Set(checks.map(c => c.resource))];
    const actions = [...new Set(checks.map(c => c.action))];
    
    // Construct optimized query
    const query = `
      SELECT 
        user_id, 
        resource_name AS resource, 
        permission_action AS action, 
        granted
      FROM user_permissions_view
      WHERE user_id IN (${userIds.map((_, i) => `$${i + 1}`).join(',')})
      AND resource_name IN (${resources.map((_, i) => `$${userIds.length + i + 1}`).join(',')})
      AND permission_action IN (${actions.map((_, i) => `$${userIds.length + resources.length + i + 1}`).join(',')})
    `;
    
    const params = [...userIds, ...resources, ...actions];
    const result = await db.query(query, params);
    
    // Create lookup table for fast results matching
    const permissionLookup = new Map<string, boolean>();
    result.rows.forEach(row => {
      const key = `${row.user_id}:${row.resource}:${row.action}`;
      permissionLookup.set(key, row.granted);
    });
    
    // Map results back to original checks
    return checks.map(check => {
      const key = `${check.userId}:${check.resource}:${check.action}`;
      return {
        ...check,
        granted: permissionLookup.get(key) || false
      };
    });
  }
}
```

## Database-Level Security

### Row-Level Security Policies

```sql
-- Enable row-level security
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Create policy for resource access based on permissions
CREATE POLICY resource_access_policy ON resources
USING (
  EXISTS (
    SELECT 1 FROM user_effective_permissions uep
    WHERE uep.resource_id = resources.id
    AND uep.user_id = current_setting('app.current_user_id', true)::uuid
    AND (uep.action = 'ViewAny' OR uep.action = 'View')
    AND uep.granted = TRUE
  )
);

-- Create policy for resource modification
CREATE POLICY resource_update_policy ON resources
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_effective_permissions uep
    WHERE uep.resource_id = resources.id
    AND uep.user_id = current_setting('app.current_user_id', true)::uuid
    AND uep.action = 'Update'
    AND uep.granted = TRUE
  )
);
```

### Permission-Specific Functions

```sql
-- Function to check if the current user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(resource_name TEXT, action_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_effective_permissions uep
    JOIN resources r ON uep.resource_id = r.id
    WHERE uep.user_id = current_setting('app.current_user_id', true)::uuid
    AND r.name = resource_name
    AND uep.action = action_name
    AND uep.granted = TRUE
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage example in a view
CREATE VIEW filtered_resources AS
  SELECT * FROM resources
  WHERE has_permission(resources.name, 'ViewAny');
```

### Optimized Stored Procedures

```sql
-- Efficient stored procedure for complex permission checks
CREATE OR REPLACE PROCEDURE check_complex_permissions(
  user_id UUID,
  OUT result JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  WITH resource_permissions AS (
    SELECT 
      r.name AS resource_name,
      array_agg(DISTINCT uep.action) AS granted_actions
    FROM user_effective_permissions uep
    JOIN resources r ON uep.resource_id = r.id
    WHERE uep.user_id = check_complex_permissions.user_id
    AND uep.granted = TRUE
    GROUP BY r.name
  )
  SELECT jsonb_object_agg(
    resource_name,
    jsonb_build_object(
      'actions', granted_actions,
      'hasViewAny', 'ViewAny' = ANY(granted_actions),
      'hasUpdate', 'Update' = ANY(granted_actions),
      'hasDelete', 'Delete' = ANY(granted_actions),
      'hasCreate', 'Create' = ANY(granted_actions)
    )
  )
  INTO result
  FROM resource_permissions;
END;
$$;
```

## Transaction Isolation

### Implementation

```typescript
async function checkPermissionsWithConsistency(
  userId: string,
  checks: Array<{ resource: string, action: string }>
): Promise<Record<string, boolean>> {
  // Use serializable isolation for consistent permission reads
  const client = await db.connect();
  
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    
    // Set user context for RLS policies
    await client.query(`SET LOCAL app.current_user_id = '${userId}'`);
    
    // Perform permission checks within transaction
    const results: Record<string, boolean> = {};
    
    for (const check of checks) {
      const query = `
        SELECT EXISTS(
          SELECT 1 FROM user_effective_permissions uep
          JOIN resources r ON uep.resource_id = r.id
          WHERE uep.user_id = $1
          AND r.name = $2
          AND uep.action = $3
          AND uep.granted = TRUE
        ) AS has_permission
      `;
      
      const result = await client.query(query, [
        userId, 
        check.resource, 
        check.action
      ]);
      
      const key = `${check.resource}:${check.action}`;
      results[key] = result.rows[0].has_permission;
    }
    
    await client.query('COMMIT');
    return results;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Related Documentation

- **[README.md](README.md)**: RBAC system overview
- **[PERMISSION_RESOLUTION.md](PERMISSION_RESOLUTION.md)**: How permissions are resolved for users
- **[CACHING_STRATEGY.md](CACHING_STRATEGY.md)**: Multi-level caching approach for permissions
- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)**: Performance techniques for the permission system

## Version History

- **1.0.0**: Initial document created from RBAC_SYSTEM.md refactoring
