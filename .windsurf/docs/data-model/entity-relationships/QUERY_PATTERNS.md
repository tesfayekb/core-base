
# Standard Query Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines standardized query patterns for interacting with the database, ensuring consistent data access patterns that respect multi-tenant boundaries and permission restrictions.

## Tenant-Scoped Queries

The entity relationships dictate specific query patterns that must be followed for data consistency and security. All queries against tenant-bound entities must:

1. Always include tenant context
2. Apply Row-Level Security (RLS) policies based on the authenticated user and active tenant
3. Use session context functions for permission checks

### Example Tenant-Scoped Query Function

```sql
-- Function implementing canonical multi-tenant query pattern
CREATE OR REPLACE FUNCTION get_tenant_resources(tenant_id UUID)
RETURNS SETOF tenant_resources
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set tenant context
  PERFORM set_tenant_context(tenant_id);
  
  -- Return tenant resources (RLS will automatically filter based on context)
  RETURN QUERY SELECT * FROM tenant_resources;
END;
$$;
```

## Permission-Aware Queries

Queries that involve permission checks should follow this pattern:

```sql
-- Function implementing permission-aware query pattern
CREATE OR REPLACE FUNCTION get_viewable_resources(user_id UUID, tenant_id UUID)
RETURNS SETOF resources
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set tenant context
  PERFORM set_tenant_context(tenant_id);
  
  -- Return only resources user has permission to view
  RETURN QUERY
  SELECT r.*
  FROM resources r
  WHERE exists (
    SELECT 1
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE p.resource_id = r.id
    AND p.action = 'View'
    AND ur.user_id = get_viewable_resources.user_id
  );
END;
$$;
```

## Cross-Tenant Operations

For operations that span tenant boundaries, use security definer functions with explicit permission checks:

```sql
-- Copy template from one tenant to another
CREATE OR REPLACE FUNCTION copy_resource_cross_tenant(
  source_resource_id UUID,
  source_tenant_id UUID,
  target_tenant_id UUID
) RETURNS UUID AS $$
DECLARE
  new_resource_id UUID;
  has_permission BOOLEAN;
BEGIN
  -- Verify current user has cross-tenant admin permission
  SELECT EXISTS (
    SELECT 1
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE p.action = 'CrossTenantAdmin'
    AND ur.user_id = auth.uid()
  ) INTO has_permission;
  
  IF NOT has_permission THEN
    RAISE EXCEPTION 'Permission denied for cross-tenant operation';
  END IF;
  
  -- Create new resource in target tenant
  INSERT INTO tenant_resources (
    tenant_id, resource_type, resource_id, metadata
  )
  SELECT
    target_tenant_id, resource_type, resource_id, metadata
  FROM
    tenant_resources
  WHERE
    id = source_resource_id AND tenant_id = source_tenant_id
  RETURNING id INTO new_resource_id;
  
  -- Log the cross-tenant operation
  INSERT INTO cross_tenant_audit_logs (
    action, 
    actor_id, 
    source_tenant_id, 
    target_tenant_id,
    resource_type,
    resource_id,
    result_resource_id
  ) VALUES (
    'CROSS_TENANT_COPY',
    auth.uid(),
    source_tenant_id,
    target_tenant_id,
    'resource',
    source_resource_id,
    new_resource_id
  );
  
  RETURN new_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Session Context Management

All tenant-specific operations require proper session context management:

```sql
-- Set tenant context function
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verify user has access to this tenant
  IF NOT EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = set_tenant_context.tenant_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User does not have access to tenant';
  END IF;

  -- Set tenant context
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current tenant function
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN nullif(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;
```

## Role and Permission Query Patterns

For retrieving user roles and permissions with tenant context:

```sql
-- Get user permissions in tenant
CREATE OR REPLACE FUNCTION get_user_permissions_in_tenant(user_id UUID, tenant_id UUID)
RETURNS TABLE(resource_name TEXT, action TEXT) AS $$
BEGIN
  -- Set tenant context
  PERFORM set_tenant_context(tenant_id);
  
  -- Return permissions
  RETURN QUERY
  SELECT r.name, p.action
  FROM resources r
  JOIN permissions p ON r.id = p.resource_id
  JOIN role_permissions rp ON p.id = rp.permission_id
  JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = get_user_permissions_in_tenant.user_id
  
  UNION
  
  SELECT r.name, p.action
  FROM resources r
  JOIN permissions p ON r.id = p.resource_id
  JOIN role_permissions rp ON p.id = rp.permission_id
  JOIN user_tenants ut ON rp.role_id = ut.role_id
  WHERE ut.user_id = get_user_permissions_in_tenant.user_id
  AND ut.tenant_id = get_user_permissions_in_tenant.tenant_id
  AND ut.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Related Documentation

- **[DATABASE_IMPLEMENTATION.md](DATABASE_IMPLEMENTATION.md)**: Database implementation details
- **[../DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md)**: Complete schema definitions
- **[../../multitenancy/DATA_ISOLATION.md](../../multitenancy/DATA_ISOLATION.md)**: Data isolation strategy
- **[../../rbac/permission-resolution/IMPLEMENTATION.md](../../rbac/permission-resolution/IMPLEMENTATION.md)**: Permission resolution implementation

## Version History

- **1.0.0**: Initial document creation from entity relationships refactoring (2025-05-22)
