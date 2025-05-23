
# SQL Implementation for Permission Resolution

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document details the SQL implementation for the permission resolution algorithm, focusing on the database functions and queries that power permission checks.

## Core Permission Check Function

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

## SuperAdmin Check Function

```sql
-- Function to check if a user is a SuperAdmin
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
    AND r.name = 'SuperAdmin'
  ) INTO v_is_super_admin;
  
  RETURN v_is_super_admin;
END;
$$;
```

## Tenant Context Resolution

```sql
-- Function to get a user's current tenant context
CREATE OR REPLACE FUNCTION get_user_current_tenant(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- First try to get from current session
  v_tenant_id := current_setting('app.current_tenant_id', TRUE)::UUID;
  
  -- If not in session, get user's default tenant
  IF v_tenant_id IS NULL THEN
    SELECT default_tenant_id INTO v_tenant_id
    FROM user_preferences
    WHERE user_id = p_user_id;
  END IF;
  
  -- If no default, get first available tenant
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM user_tenants
    WHERE user_id = p_user_id
    LIMIT 1;
  END IF;
  
  RETURN v_tenant_id;
END;
$$;
```

## Role Permission Check Function

```sql
-- Function to check if any role has a specific permission
CREATE OR REPLACE FUNCTION check_roles_for_permission(
  p_role_ids UUID[],
  p_resource_id UUID,
  p_action TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ANY(p_role_ids)
    AND p.resource_id = p_resource_id
    AND p.action = p_action
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;
```

## Resource-Specific Permission Check

```sql
-- Function to check resource-specific permissions
CREATE OR REPLACE FUNCTION check_resource_specific_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_tenant_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_general_permission BOOLEAN;
  v_has_specific_permission BOOLEAN;
  v_tenant_id UUID;
  v_resource_type_id UUID;
BEGIN
  -- Get effective tenant ID
  v_tenant_id := COALESCE(p_tenant_id, get_user_current_tenant(p_user_id));
  
  -- Early return for SuperAdmin
  IF is_super_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- First check general permission (may be sufficient)
  v_has_general_permission := check_user_permission(
    p_user_id, 
    p_action,
    p_resource_type,
    v_tenant_id
  );
  
  IF v_has_general_permission THEN
    RETURN TRUE;
  END IF;
  
  -- Get resource type ID
  SELECT id INTO v_resource_type_id FROM resources WHERE name = p_resource_type;
  IF v_resource_type_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check for resource-specific permission
  SELECT EXISTS (
    SELECT 1
    FROM resource_specific_permissions rsp
    JOIN permissions p ON p.id = rsp.permission_id
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id
    AND rsp.resource_id = v_resource_type_id
    AND rsp.specific_resource_id = p_resource_id
    AND p.action = p_action
  ) INTO v_has_specific_permission;
  
  RETURN v_has_specific_permission;
END;
$$;
```

## Query Optimization

For detailed information about optimizing these queries, see:

- **[../PERMISSION_QUERY_OPTIMIZATION.md](../PERMISSION_QUERY_OPTIMIZATION.md)**: Advanced optimization techniques
- **[../DATABASE_OPTIMIZATION.md](../DATABASE_OPTIMIZATION.md)**: Database design for permissions

## Related Documentation

- **[RESOLUTION_ALGORITHM_CORE.md](RESOLUTION_ALGORITHM_CORE.md)**: Core resolution algorithm
- **[SPECIAL_CASES.md](SPECIAL_CASES.md)**: Special resolution cases
- **[../DATABASE_OPTIMIZATION.md](../DATABASE_OPTIMIZATION.md)**: Database design for permissions

## Version History

- **1.0.0**: Initial SQL implementation document (2025-05-22)
