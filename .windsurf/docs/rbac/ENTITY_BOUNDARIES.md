
# Entity Permission Boundaries

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-23

## Overview

This document defines the canonical implementation of entity permission boundaries across the system, establishing how permissions are granted and enforced within and across entity boundaries.

## Core Principles

1. **Hierarchical Boundary Enforcement**:
   - Permissions are contained within entity boundaries
   - Cross-entity operations require explicit cross-boundary permissions
   - Entity administrators can only grant permissions they themselves possess

2. **Entity Isolation**:
   - Each entity operates as an isolated permission domain
   - Data and operations respect entity boundaries
   - Multi-tenant data queries follow canonical patterns in [../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md)

3. **Permission Elevation Constraints**:
   - Entity administrators cannot grant permissions they do not have
   - Permission grants are validated against the grantor's permissions
   - System enforces principle of least privilege

## Boundary Implementation

### Permission Grant Flow Control

```typescript
// Canonical implementation of permission grant validation
function canGrantPermission(grantor, grantee, permission) {
  // 1. Check if grantor has the permission they're trying to grant
  if (!hasPermission(grantor, permission)) {
    return false;
  }
  
  // 2. Check if grantor has permission to manage roles
  if (!hasPermission(grantor, 'manage_roles')) {
    return false;
  }
  
  // 3. Check entity boundary constraints
  if (grantor.entityId !== grantee.entityId && 
      !hasPermission(grantor, 'cross_entity_management')) {
    return false;
  }
  
  return true;
}
```

### Database-Level Enforcement

All entity-scoped tables implement the canonical multi-tenant query patterns defined in [../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md).

```sql
-- Example entity boundary enforcement through RLS
CREATE POLICY entity_boundary_policy ON entity_resources
  USING (
    entity_id = public.get_current_entity_id() OR 
    public.user_has_permission(auth.uid(), 'cross_entity_access', 'entities')
  );
```

### Role and Permission Validation

```typescript
// Canonical function for validating role assignments across boundaries
async function validateRoleAssignment(
  assignerId: string,
  assigneeId: string,
  roleId: string,
  entityId: string
): Promise<boolean> {
  // Follow tenant context patterns from DATABASE_QUERY_PATTERNS.md
  return withEntityContext(entityId, async (client) => {
    // 1. Verify assigner has role management permission
    const canManageRoles = await client.rpc('user_has_permission', {
      user_id: assignerId,
      action_name: 'AssignRoles', 
      resource_name: 'roles'
    });
    
    if (!canManageRoles) return false;
    
    // 2. Verify role exists in this entity
    const { data: role } = await client
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .eq('entity_id', entityId)
      .single();
      
    if (!role) return false;
    
    // 3. Verify all permissions in the role are owned by the assigner
    const { data: rolePermissions } = await client
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);
      
    for (const { permission_id } of rolePermissions) {
      const hasPermission = await client.rpc('user_has_permission_by_id', {
        user_id: assignerId,
        permission_id
      });
      
      if (!hasPermission) return false;
    }
    
    return true;
  });
}
```

## Cross-Entity Operations

### Explicit Cross-Entity Permissions

```typescript
// Types of cross-entity permissions
enum CrossEntityPermissionType {
  VIEW = 'view',
  MANAGE = 'manage',
  FULL_ACCESS = 'full_access'
}

// Cross-entity permission grant
interface CrossEntityPermission {
  userId: string;
  sourceEntityId: string;
  targetEntityId: string;
  permissionType: CrossEntityPermissionType;
  grantedBy: string;
  grantedAt: Date;
}
```

### Cross-Entity Data Access

For reading data across entity boundaries, follow the cross-tenant query patterns defined in [../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md).

```typescript
// Query data across entity boundaries (implements patterns from DATABASE_QUERY_PATTERNS.md)
async function queryCrossEntityData(
  userId: string,
  sourceEntityId: string,
  targetEntityId: string,
  resource: string
): Promise<any[]> {
  // 1. Verify cross-entity permission
  const hasCrossEntityAccess = await supabase.rpc('check_cross_entity_permission', {
    user_id: userId,
    source_entity_id: sourceEntityId,
    target_entity_id: targetEntityId,
    permission_type: CrossEntityPermissionType.VIEW
  });
  
  if (!hasCrossEntityAccess) {
    throw new Error('Permission denied for cross-entity access');
  }
  
  // 2. Execute query with target entity context
  return withEntityContext(targetEntityId, async (client) => {
    const { data, error } = await client
      .from(resource)
      .select('*');
      
    if (error) throw error;
    return data;
  });
}
```

## Audit Requirements

All cross-entity operations must be logged to the audit system:

```typescript
// Audit cross-entity access (follows patterns from EVENT_ARCHITECTURE.md)
async function logCrossEntityAccess(
  userId: string,
  sourceEntityId: string,
  targetEntityId: string,
  action: string,
  resource: string,
  success: boolean
): Promise<void> {
  await eventBus.emit('security', {
    id: generateUuid(),
    type: 'crossEntityAccess',
    source: 'entity-boundary-system',
    time: new Date().toISOString(),
    dataVersion: '1.0',
    data: {
      action,
      resource,
      success
    },
    metadata: {
      userId,
      sourceEntityId,
      targetEntityId
    }
  });
}
```

## Implementation Examples

For concrete implementation examples of entity boundary enforcement and cross-entity operations, see [../multitenancy/IMPLEMENTATION_EXAMPLES.md#integration-with-rbac-system](../multitenancy/IMPLEMENTATION_EXAMPLES.md#integration-with-rbac-system).

## Related Documentation

- **[README.md](README.md)**: RBAC system overview
- **[PERMISSION_RESOLUTION.md](PERMISSION_RESOLUTION.md)**: How permissions are resolved
- **[../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md)**: Canonical multi-tenant query patterns
- **[../integration/EVENT_ARCHITECTURE.md](../integration/EVENT_ARCHITECTURE.md)**: Canonical event architecture
- **[../security/MULTI_TENANT_ROLES.md](../security/MULTI_TENANT_ROLES.md)**: Multi-tenant role management
- **[../multitenancy/IMPLEMENTATION_EXAMPLES.md](../multitenancy/IMPLEMENTATION_EXAMPLES.md)**: Concrete implementation examples

## Version History

- **1.1.0**: Added reference to implementation examples and updated links for consistency (2025-05-23)
- **1.0.0**: Initial entity boundaries canonical document (2025-05-22)
