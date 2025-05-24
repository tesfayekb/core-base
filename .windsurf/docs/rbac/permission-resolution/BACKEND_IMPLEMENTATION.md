
# Backend Permission Resolution Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides implementation details for the backend components of the permission resolution system, including database functions and API endpoints.

## Database Functions

Core database functions that implement permission resolution:

```sql
-- Check if user has permission
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id UUID,
  p_action TEXT,
  p_resource TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_resource_id UUID;
BEGIN
  -- Short circuit for SuperAdmin
  IF is_super_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Get resource ID
  SELECT id INTO v_resource_id
  FROM resources
  WHERE name = p_resource;
  
  IF v_resource_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get current tenant context
  DECLARE v_tenant_id UUID := current_tenant_id();
  
  -- Check if user has permission through any of their roles
  SELECT EXISTS (
    -- Global roles
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id
    AND p.resource_id = v_resource_id
    AND p.action = p_action
    
    UNION
    
    -- Tenant-specific roles (if in tenant context)
    SELECT 1
    FROM role_permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_tenants ut ON rp.role_id = ut.role_id
    WHERE ut.user_id = p_user_id
    AND v_tenant_id IS NOT NULL
    AND ut.tenant_id = v_tenant_id
    AND p.resource_id = v_resource_id
    AND p.action = p_action
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$;

-- Get all permissions for a user in current tenant context
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID
) RETURNS TABLE (
  resource_name TEXT,
  action_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Short circuit for SuperAdmin - return all permissions
  IF is_super_admin(p_user_id) THEN
    RETURN QUERY
      SELECT r.name, p.action
      FROM resources r
      JOIN resource_permission_actions rpa ON r.id = rpa.resource_id
      JOIN permissions p ON r.id = p.resource_id AND rpa.action_key = p.action
      WHERE rpa.is_active = true;
    RETURN;
  END IF;
  
  -- Get current tenant context
  v_tenant_id := current_tenant_id();
  
  -- Return permissions from all user roles
  RETURN QUERY
    -- Global roles
    SELECT r.name, p.action
    FROM resources r
    JOIN permissions p ON r.id = p.resource_id
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
    
    UNION
    
    -- Tenant-specific roles (if in tenant context)
    SELECT r.name, p.action
    FROM resources r
    JOIN permissions p ON r.id = p.resource_id
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_tenants ut ON rp.role_id = ut.role_id
    WHERE ut.user_id = p_user_id
    AND v_tenant_id IS NOT NULL
    AND ut.tenant_id = v_tenant_id;
END;
$$;
```

## API Endpoints

API endpoints for permission resolution:

```typescript
// Permission check endpoint
router.get('/api/permissions/check', async (req, res) => {
  try {
    const { action, resource, resourceId } = req.query;
    const userId = req.user.id;
    
    if (!action || !resource) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const hasPermission = await permissionService.checkPermission(
      userId,
      action as string,
      resource as string,
      resourceId as string
    );
    
    return res.json({ hasPermission });
  } catch (error) {
    console.error('Permission check error:', error);
    return res.status(500).json({ error: 'Failed to check permission' });
  }
});

// Get all user permissions endpoint
router.get('/api/permissions', async (req, res) => {
  try {
    const userId = req.user.id;
    const permissions = await permissionService.getUserPermissions(userId);
    
    return res.json({ permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    return res.status(500).json({ error: 'Failed to retrieve permissions' });
  }
});
```

## Permission Service

Service layer for permission resolution:

```typescript
class PermissionService {
  private cache: PermissionCache;
  
  constructor() {
    this.cache = new PermissionCache();
  }
  
  /**
   * Check if a user has a specific permission
   */
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    // Check if SuperAdmin (always return true)
    if (await this.isSuperAdmin(userId)) {
      return true;
    }
    
    // Generate cache key
    const cacheKey = `${userId}:${resource}:${action}${resourceId ? `:${resourceId}` : ''}`;
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    
    // Perform database check
    const { data, error } = await supabase.rpc('check_permission', {
      p_user_id: userId,
      p_action: action,
      p_resource: resource,
      p_resource_id: resourceId
    });
    
    if (error) {
      console.error('Permission check error:', error);
      return false;
    }
    
    // Cache result
    this.cache.set(cacheKey, !!data);
    
    return !!data;
  }
  
  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    // Check if SuperAdmin (return all permissions)
    if (await this.isSuperAdmin(userId)) {
      return await this.getAllSystemPermissions();
    }
    
    // Get from database
    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Get permissions error:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Check if user is SuperAdmin
   */
  private async isSuperAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .inner_join('roles on user_roles.role_id = roles.id')
      .eq('roles.name', 'SuperAdmin')
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get all system permissions
   */
  private async getAllSystemPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions_view')
      .select('resource_name, action_name');
    
    if (error) {
      console.error('Get all permissions error:', error);
      return [];
    }
    
    return data || [];
  }
}
```

## Related Documentation

- **[IMPLEMENTATION_OVERVIEW.md](IMPLEMENTATION_OVERVIEW.md)**: Implementation overview
- **[FRONTEND_IMPLEMENTATION.md](FRONTEND_IMPLEMENTATION.md)**: Frontend implementation details
- **[UI_INTEGRATION.md](UI_INTEGRATION.md)**: UI integration patterns
- **[RESOLUTION_ALGORITHM.md](RESOLUTION_ALGORITHM.md)**: Permission resolution algorithm
- **[DATABASE_QUERIES.md](DATABASE_QUERIES.md)**: Database implementation details

## Version History

- **1.0.0**: Initial document created from IMPLEMENTATION.md refactoring (2025-05-23)
