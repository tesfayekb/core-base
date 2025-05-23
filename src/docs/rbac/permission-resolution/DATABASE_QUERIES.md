
# Permission Resolution Database Queries

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the database query implementations used by the permission resolution algorithm. It focuses on the SQL functions and queries that power the permission system.

## Database Function Implementation

The core permission resolution query that powers the algorithm:

```sql
-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_tenant_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_tenant_id UUID;
  v_resource_id UUID;
BEGIN
  -- Get effective tenant ID
  v_tenant_id := COALESCE(p_tenant_id, get_user_current_tenant(p_user_id));
  
  -- Early return for SuperAdmin
  IF is_super_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Get resource ID
  SELECT id INTO v_resource_id FROM resources WHERE name = p_resource_type;
  IF v_resource_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check for permission across all user's roles
  SELECT EXISTS (
    -- Global roles (not tenant-specific)
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id
    AND p.resource_id = v_resource_id
    AND p.action = p_action
    
    UNION
    
    -- Tenant-specific roles
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN user_tenants ut ON ut.role_id = rp.role_id
    WHERE ut.user_id = p_user_id
    AND ut.tenant_id = v_tenant_id
    AND p.resource_id = v_resource_id
    AND p.action = p_action
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;
```

## Batch Permission Retrieval

Query to retrieve all permissions for a user in a single database call:

```sql
-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_tenant_id UUID DEFAULT NULL
) RETURNS TABLE (
  resource_name TEXT,
  action_name TEXT
) AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get effective tenant ID
  v_tenant_id := COALESCE(p_tenant_id, get_user_current_tenant(p_user_id));
  
  -- SuperAdmin check
  IF is_super_admin(p_user_id) THEN
    -- Return all system permissions for SuperAdmin
    RETURN QUERY
      SELECT r.name, p.action
      FROM resources r
      JOIN permissions p ON r.id = p.resource_id;
    RETURN;
  END IF;
  
  -- Return permissions from global and tenant roles
  RETURN QUERY
    SELECT DISTINCT r.name, p.action
    FROM resources r
    JOIN permissions p ON r.id = p.resource_id
    LEFT JOIN role_permissions rp ON p.id = rp.permission_id
    LEFT JOIN user_roles ur ON rp.role_id = ur.role_id AND ur.user_id = p_user_id
    LEFT JOIN user_tenants ut ON rp.role_id = ut.role_id 
                             AND ut.user_id = p_user_id
                             AND ut.tenant_id = v_tenant_id
    WHERE ur.user_id IS NOT NULL OR ut.user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Index Optimizations

Critical database indexes for permission resolution performance:

```sql
-- Indexes for permission resolution
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource_id, action);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_tenant ON user_tenants(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_role ON user_tenants(role_id);
```

## Query Performance Considerations

1. **Combined Queries**: The `UNION` operation combines global and tenant-specific permissions
2. **Exists Optimization**: Using `EXISTS` for efficient permission checking
3. **Index Usage**: Queries designed to utilize the indexes defined above
4. **Early Returns**: SQL functions implement early returns for performance
5. **Security Context**: `SECURITY DEFINER` ensures consistent execution permissions

## Database View Integration

```sql
-- View for permission resolution dashboards and reporting
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT 
  u.id AS user_id,
  u.email,
  t.id AS tenant_id,
  t.name AS tenant_name,
  r.id AS role_id,
  r.name AS role_name,
  res.name AS resource_name,
  p.action AS action_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN user_tenants ut ON u.id = ut.user_id
LEFT JOIN tenants t ON ut.tenant_id = t.id
LEFT JOIN roles tr ON ut.role_id = tr.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id OR tr.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN resources res ON p.resource_id = res.id;
```

## Related Documentation

- **[RESOLUTION_ALGORITHM.md](RESOLUTION_ALGORITHM.md)**: Overview of resolution process
- **[CORE_ALGORITHM.md](CORE_ALGORITHM.md)**: Core algorithm pseudocode
- **[../DATABASE_OPTIMIZATION.md](../DATABASE_OPTIMIZATION.md)**: SQL optimization for permissions
- **[../../data-model/entity-relationships/RBAC_MODEL.md](../../data-model/entity-relationships/RBAC_MODEL.md)**: Database schema for RBAC

## Version History

- **1.0.0**: Initial document created from RESOLUTION_ALGORITHM.md refactoring (2025-05-23)
