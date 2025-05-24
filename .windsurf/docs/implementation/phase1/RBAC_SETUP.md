
# RBAC Foundation Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Step-by-step guide for implementing the Role-Based Access Control foundation with multi-tenant support.

## Implementation Steps

### Step 1: Create Permission Types

```typescript
// src/types/permissions.ts
export interface Permission {
  id: string;
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  permissions: string[];
  created_at: string;
}

export const PERMISSION_ACTIONS = [
  'Create',
  'Read', 
  'Update',
  'Delete',
  'ViewAny',
  'UpdateAny',
  'DeleteAny'
] as const;

export const RESOURCES = [
  'users',
  'roles',
  'permissions',
  'tenants',
  'audit_logs'
] as const;
```

### Step 2: Implement Permission Service

```typescript
// src/services/permissionService.ts
import { supabase } from '../lib/supabase';
import { Permission } from '../types/permissions';

export class PermissionService {
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        user_id: userId,
        action_name: action,
        resource_name: resource,
        resource_id: resourceId
      });
      
      if (error) {
        console.error('Permission check error:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }
  
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        user_id: userId
      });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }
}
```

### Step 3: Create Database Functions for RBAC

```sql
-- Check user permission function
CREATE OR REPLACE FUNCTION check_user_permission(
  user_id UUID,
  action_name TEXT,
  resource_name TEXT,
  resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
  user_tenant_id UUID;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO user_tenant_id 
  FROM auth.users 
  WHERE id = user_id;
  
  -- Set tenant context
  PERFORM set_tenant_context(user_tenant_id);
  
  -- Check if user has permission through roles
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_permission.user_id
    AND (action_name || ':' || resource_name) = ANY(r.permissions)
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql;
```

## Validation Steps

### Test Permission Assignment

```sql
-- Create test role with permissions
INSERT INTO roles (tenant_id, name, permissions) 
VALUES (
  'test-tenant-id',
  'TestRole',
  ARRAY['Read:users', 'Update:users']
);
```

### Test Permission Checks

```typescript
const hasPermission = await permissionService.checkPermission(
  'user-id',
  'Read',
  'users'
);
console.log('User has permission:', hasPermission);
```

## Common Issues & Solutions

**Issue**: Permission function returns null instead of boolean
```sql
-- Solution: Ensure function handles edge cases
CREATE OR REPLACE FUNCTION check_user_permission(...)
RETURNS BOOLEAN AS $$
BEGIN
  -- Always return a boolean, never null
  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql;
```

**Issue**: Permissions not updating after role changes
```typescript
// Solution: Clear permission cache after role updates
class PermissionService {
  private cache = new Map();
  
  clearCache(userId: string) {
    this.cache.delete(userId);
  }
  
  async updateUserRole(userId: string, roleId: string) {
    // Update role
    await this.assignRole(userId, roleId);
    // Clear cache
    this.clearCache(userId);
  }
}
```

## Next Steps

- Proceed to [SECURITY_SETUP.md](SECURITY_SETUP.md) for security infrastructure setup
- Review [../testing/RBAC_TESTING.md](../testing/RBAC_TESTING.md) for RBAC testing

## Version History

- **1.0.0**: Initial RBAC implementation guide (2025-05-23)
