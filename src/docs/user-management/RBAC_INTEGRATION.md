
# RBAC Integration

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-23

## Overview

This document describes how the user management system integrates with the Role-Based Access Control (RBAC) system using the direct permission assignment model.

## Direct Role Assignment Architecture

### User-Role Relationship

Users are assigned roles through direct mechanisms without hierarchy:

1. **Direct Role Assignment**:
   - Roles assigned at the user level (`user_roles` table)
   - No role inheritance or hierarchy
   - Flat role structure for clear permission boundaries

2. **Tenant-Specific Role Assignment**:
   - Roles assigned within tenant context (`user_tenants` table)
   - Different roles possible in different tenants
   - Scoped to operations within the tenant
   - No cross-tenant role inheritance

```sql
-- Direct role assignment table (no hierarchy)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role_id)
);

-- Tenant-specific direct role assignment 
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

The system provides automatic direct role assignment for new users:

1. **System Default Role**:
   - All new users receive the `BasicUser` role directly
   - Provides minimal permissions for self-service operations
   - Cannot be removed from users (protected by system)

2. **Tenant Default Roles**:
   - Each tenant can define a default role for new members
   - Applied during user-tenant association
   - No inheritance from parent or system roles

## Direct Permission Resolution

The permission resolution process follows the direct assignment model:

1. **Context-Aware Permission Checks**:
   - User permissions evaluated within current tenant context
   - Permission union across all directly assigned roles
   - SuperAdmin bypass for system-critical operations

2. **Direct Permission Resolution Logic**:
   ```typescript
   // Direct permission check function
   async function hasDirectPermission(
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
     
     // Get user roles (both global and tenant-specific, no hierarchy)
     const directRoles = await getUserDirectRoles(userId, tenantId);
     if (!directRoles.length) return false;
     
     // Check permissions across all directly assigned roles (union)
     return await checkDirectRolePermissions(directRoles, action, resourceType, resourceId);
   }
   ```

3. **Direct Permission Caching**:
   - User permissions cached for performance
   - Cache invalidated on direct role changes
   - Separate cache entries per tenant context
   - Time-limited cache validity

## Role Assignment Permissions

Role assignment follows these direct permission rules:

1. **Direct Assignment Permissions**:
   - Requires `ManageRoles` permission to assign roles directly
   - SuperAdmin can assign any role directly
   - Entity administrators can only assign roles they directly possess
   - Users cannot assign roles to themselves

2. **Permission Checking**:
   - Role assignment validated at application level
   - Database-level constraints enforce security
   - Assignment attempts logged for audit

## Integration with User Management

### Direct Role Management UI

The user management interface provides:

1. **Direct Role Management Interface**:
   - Direct role assignment dialog
   - Role removal confirmation
   - Direct role conflict detection
   - Permission preview for directly assigned roles

2. **Tenant Direct Role Management**:
   - Tenant-specific direct role assignment
   - Cross-tenant role comparison
   - Default tenant role configuration
   - Bulk tenant role updates

### User Context Switching

When users switch tenant context:

1. **Direct Permission Recalculation**:
   - Clear permission cache
   - Recalculate effective permissions from directly assigned roles
   - Apply new permission set to UI
   - Update tenant-specific UI elements

2. **Direct Role-Based UI Adaptation**:
   - Dynamic navigation updates based on direct permissions
   - Feature availability changes
   - Permission-based component rendering
   - Conditional action enabling/disabling

## Related Documentation

- **[../rbac/README.md](../rbac/README.md)**: RBAC system overview
- **[../rbac/ROLE_ARCHITECTURE.md](../rbac/ROLE_ARCHITECTURE.md)**: Direct role structure
- **[../rbac/permission-resolution/README.md](../rbac/permission-resolution/README.md)**: Direct permission resolution
- **[../rbac/PERMISSION_TYPES.md](../rbac/PERMISSION_TYPES.md)**: Permission taxonomy
- **[MULTITENANCY_INTEGRATION.md](MULTITENANCY_INTEGRATION.md)**: Multi-tenant role management

## Version History

- **1.1.0**: Updated to align with direct permission assignment model (2025-05-23)
- **1.0.0**: Initial document created from user management refactoring (2025-05-22)
