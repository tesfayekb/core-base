
# RBAC Integration

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document describes how the user management system integrates with the Role-Based Access Control (RBAC) system, focusing on role assignment architecture and permission resolution.

## Role Assignment Architecture

### User-Role Relationship

Users are assigned roles through two distinct mechanisms:

1. **Direct Role Assignment**:
   - Roles assigned at the user level (`user_roles` table)
   - Global roles that apply across the system
   - Typically used for system-wide administrative roles

2. **Tenant-Specific Role Assignment**:
   - Roles assigned within tenant context (`user_tenants` table)
   - Different roles possible in different tenants
   - Scoped to operations within the tenant

```sql
-- Direct role assignment table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role_id)
);

-- Tenant-specific role assignment 
CREATE TABLE user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);
```

### Default Roles

The system provides automatic role assignment for new users:

1. **System Default Role**:
   - All new users receive the `BasicUser` role
   - Provides minimal permissions for self-service operations
   - Cannot be removed from users (protected by system)

2. **Tenant Default Roles**:
   - Each tenant can define a default role for new members
   - Applied during user-tenant association
   - Can be overridden during explicit invitation

3. **Role Templates**:
   - Predefined role collections for common user types
   - Simplifies role assignment for administrators
   - Configurable per-tenant

```typescript
interface TenantRoleConfig {
  tenantId: string;
  defaultRoleId: string;
  roleTemplates: Array<{
    name: string;
    description: string;
    roleIds: string[];
  }>;
}
```

### Role Assignment Permissions

Role assignment follows these permission rules:

1. **Assignment Permissions**:
   - Requires `ManageRoles` permission to assign roles
   - SuperAdmin can assign any role
   - Entity administrators can only assign roles they possess
   - Users cannot assign roles to themselves

2. **Permission Checking**:
   - Role assignment validated at application level
   - Database-level constraints enforce security
   - Assignment attempts logged for audit

3. **Assignment Workflow**:
   - Direct assignment by administrator
   - Role request with approval workflow
   - Automatic assignment based on rules
   - Bulk assignment operations

## Permission Resolution

The permission resolution process follows the direct permission assignment model with these characteristics:

1. **Context-Aware Permission Checks**:
   - User permissions evaluated within current tenant context
   - Permission union across all assigned roles
   - SuperAdmin bypass for system-critical operations

2. **Permission Resolution Logic**:
   ```typescript
   // Permission check function
   async function hasPermission(
     userId: string,
     action: string,
     resourceType: string,
     resourceId?: string
   ): Promise<boolean> {
     // Short-circuit for SuperAdmin
     if (await isSuperAdmin(userId)) return true;
     
     // Get current tenant context
     const tenantId = getCurrentTenantContext();
     if (!tenantId) return false;
     
     // Get user roles (both global and tenant-specific)
     const roles = await getUserRoles(userId, tenantId);
     if (!roles.length) return false;
     
     // Check permissions across all roles (union)
     return await checkRolePermissions(roles, action, resourceType, resourceId);
   }
   ```

3. **Permission Caching**:
   - User permissions cached for performance
   - Cache invalidated on role changes
   - Separate cache entries per tenant context
   - Time-limited cache validity

```typescript
interface PermissionCacheKey {
  userId: string;
  tenantId: string;
  timestamp: number;
}

interface PermissionCacheEntry {
  permissions: Set<string>; // Format: "action:resourceType"
  expiresAt: number;
}

// Permission cache implementation
class PermissionCache {
  private cache = new Map<string, PermissionCacheEntry>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minute TTL
  
  getCacheKey(userId: string, tenantId: string): string {
    return `${userId}:${tenantId}`;
  }
  
  getPermissions(userId: string, tenantId: string): Set<string> | null {
    const key = this.getCacheKey(userId, tenantId);
    const entry = this.cache.get(key);
    
    if (!entry || entry.expiresAt < Date.now()) {
      return null; // Cache miss or expired
    }
    
    return entry.permissions;
  }
  
  setPermissions(userId: string, tenantId: string, permissions: Set<string>): void {
    const key = this.getCacheKey(userId, tenantId);
    this.cache.set(key, {
      permissions,
      expiresAt: Date.now() + this.TTL_MS
    });
  }
  
  invalidate(userId: string, tenantId?: string): void {
    if (tenantId) {
      // Invalidate specific tenant cache
      this.cache.delete(this.getCacheKey(userId, tenantId));
    } else {
      // Invalidate all tenant caches for user
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }
}
```

## Integration with User Management

### Role Assignment UI

The user management interface provides:

1. **Role Management Interface**:
   - Role assignment dialog
   - Role removal confirmation
   - Role conflict detection
   - Permission preview

2. **Tenant Role Management**:
   - Tenant-specific role assignment
   - Cross-tenant role comparison
   - Default tenant role configuration
   - Bulk tenant role updates

3. **Permission Visualization**:
   - Effective permission display
   - Permission source tracing
   - Permission comparison
   - Permission inheritance visual display

### User Context Switching

When users switch tenant context:

1. **Permission Recalculation**:
   - Clear permission cache
   - Recalculate effective permissions
   - Apply new permission set to UI
   - Update tenant-specific UI elements

2. **Role-Based UI Adaptation**:
   - Dynamic navigation updates
   - Feature availability changes
   - Permission-based component rendering
   - Conditional action enabling/disabling

## Role and Permission Testing

The system provides automated testing for role-based access:

1. **Permission Test Cases**:
   - Access with appropriate permissions
   - Rejection with insufficient permissions
   - Role-based access scenarios
   - Permission boundary tests

2. **Test Data Generation**:
   ```typescript
   export const createTestUser = (overrides?: Partial<User>) => ({
     id: faker.string.uuid(),
     email: faker.internet.email(),
     fullName: faker.person.fullName(),
     isActive: true,
     role: 'user',
     ...overrides
   });
   
   export const createTestRole = (overrides?: Partial<Role>) => ({
     id: faker.string.uuid(),
     name: `Role-${faker.string.alphanumeric(5)}`,
     description: faker.lorem.sentence(),
     isSystemRole: false,
     ...overrides
   });
   
   export const assignRoleToUser = (userId: string, roleId: string) => ({
     id: faker.string.uuid(),
     userId,
     roleId,
     createdAt: new Date(),
     updatedAt: new Date(),
     createdBy: faker.string.uuid()
   });
   ```

## Related Documentation

- **[../rbac/README.md](../rbac/README.md)**: RBAC system overview
- **[../rbac/ROLE_ARCHITECTURE.md](../rbac/ROLE_ARCHITECTURE.md)**: Role structure
- **[../rbac/permission-resolution/README.md](../rbac/permission-resolution/README.md)**: Permission resolution process
- **[../rbac/PERMISSION_TYPES.md](../rbac/PERMISSION_TYPES.md)**: Permission taxonomy
- **[MULTITENANCY_INTEGRATION.md](MULTITENANCY_INTEGRATION.md)**: Multi-tenant role management

## Version History

- **1.0.0**: Initial document created from user management refactoring (2025-05-22)
