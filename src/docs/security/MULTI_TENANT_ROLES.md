
# Multi-Tenant Role Management Architecture

> **Version**: 1.4.0  
> **Last Updated**: 2025-05-22

This document outlines the architectural approach for implementing entity-specific role management within the system.

## Core Architecture Principles

The multi-tenant role management system is designed with these guiding principles:

1. **Entity Isolation**: Each entity's role definitions are isolated from other entities
2. **System Role Integration**: Entities can adopt and use system-defined roles
3. **Permission Boundaries**: Entity administrators can only grant permissions within their scope
4. **Performance Optimization**: Role and permission resolution is optimized for high-throughput systems

## Permission Resolution Across Tenants

### Standardized Cross-Tenant Permission Model

The system implements a consistent approach to permission resolution across multiple tenants:

1. **Tenant Context Binding**:
   - Permissions are always evaluated within a specific tenant context
   - Users authenticate globally but operate within a tenant context
   - Permission checks include the current tenant context
   - No inheritance of permissions across tenant boundaries

2. **Direct Permission Assignment Model**:
   - Permissions are explicitly assigned to roles without hierarchical inheritance
   - Users with multiple roles have a union of all permissions from their assigned roles
   - No implicit permission inheritance across roles or tenants
   - Clear audit trail for all permission assignments

3. **Permission Resolution Process**:
   ```typescript
   // Clear permission resolution across tenants
   const userHasPermission = (
     userId: string, 
     permission: string, 
     resource: string,
     tenantId: string
   ): boolean => {
     // Get user's roles in this specific tenant
     const userRoles = getUserRolesInTenant(userId, tenantId);
     
     // SuperAdmin role always has all permissions in any tenant
     if (userRoles.includes('super_admin')) {
       return true;
     }
     
     // For other roles, check explicit permission assignments
     return userRoles.some(role => {
       const rolePermissions = getRolePermissions(role.id, tenantId);
       return rolePermissions.some(p => 
         p.action === permission && p.resource === resource
       );
     });
   };
   ```

### Multi-Tenant Permission Cache

To optimize permission resolution across tenants:

1. **Tenant-Specific Cache Entries**:
   - Separate cache entries per tenant
   - Cache key format: `user:{userId}:tenant:{tenantId}:permissions`
   - Cache invalidation on role/permission changes
   - Cache TTL to prevent stale permissions

2. **Permission Preloading**:
   - Permissions preloaded on tenant context switch
   - Batch loading of common permission sets
   - Background refresh for long-lived sessions

### Permission Visibility Across Tenants

1. **Global User, Local Permissions**:
   - Users exist globally but have tenant-specific permissions
   - Permission checks always include tenant context
   - UI elements adapt based on current tenant context permissions
   - Cross-tenant operations require explicit permissions

2. **Tenant Switching**:
   - Permission recalculation on tenant switch
   - No permission retention between tenants
   - Security context isolation between tenants
   - Audit logging for tenant context switches

## Entity-Specific Role Architecture

### Role Types

The system supports three categories of roles:

1. **System Roles**: Platform-wide roles defined by system administrators
   - Immutable core permissions
   - Available to all entities
   - Versioned and maintained centrally

2. **Entity-Specific Roles**: Custom roles defined by entity administrators
   - Created and managed by entity administrators
   - Only visible and applicable within the entity's scope
   - Cannot exceed the entity administrator's own permission boundaries

3. **Entity-Customized System Roles**: Entity-specific adaptations of system roles
   - Based on system roles but with entity-specific modifications
   - Customizations are isolated to the entity's scope
   - System role updates can be selectively applied to customized versions

### Permission Scope Control

The multi-tenant architecture implements scope control through:

1. **Entity Context**: All permission checks include entity context
2. **Permission Boundaries**: Entity administrators can only grant permissions they possess
3. **Resource Segmentation**: Resources are segmented by entity where appropriate
4. **Cross-Entity Access Control**: Strict controls for cross-entity operations

## Permission Boundary Enforcement

The system enforces the principle that entity administrators can only grant permissions they themselves possess through several mechanisms:

### 1. Technical Enforcement Layers

The boundary restrictions are enforced at multiple layers:

- **Database Layer**: SQL triggers validate permission grants against grantor's permissions
- **API Layer**: Middleware validates all permission-related requests
- **Application Layer**: UI prevents attempts to grant unavailable permissions
- **Audit Layer**: All permission changes are logged for compliance monitoring

For a visual representation of boundary enforcement, see the [Entity Boundary Enforcement Diagram](../rbac/diagrams/ENTITY_BOUNDARY_ENFORCEMENT.md).

### 2. Permission Grant Validation Algorithm

```
function validatePermissionGrant(grantor, permission, target) {
  // Check if grantor has the permission they're trying to grant
  if (!hasPermission(grantor, permission)) {
    return {
      valid: false,
      reason: 'MISSING_PERMISSION',
      details: `Grantor does not possess the ${permission} permission`
    };
  }
  
  // Check if grantor has permission management capability
  if (!hasPermission(grantor, 'ManagePermissions')) {
    return {
      valid: false,
      reason: 'CANNOT_MANAGE_PERMISSIONS',
      details: 'Grantor lacks permission management capability'
    };
  }
  
  // Check entity boundary if applicable
  if (target.entityId && grantor.entityId !== target.entityId) {
    if (!hasPermission(grantor, 'CrossEntityManagement')) {
      return {
        valid: false,
        reason: 'ENTITY_BOUNDARY_VIOLATION',
        details: 'Cannot grant permissions across entity boundaries'
      };
    }
  }
  
  return { valid: true };
}
```

### 3. Entity Administrator Permission Constraints

Entity administrators face the following constraints when managing permissions:

- **Permission Subset Restriction**: Can only grant a subset of their own permissions
- **Role Composition Limitation**: When creating roles, can only include permissions they possess
- **System Role Customization**: When customizing system roles, can only remove permissions, not add new ones
- **Permission Delegation**: Can delegate permission management capability but only for permissions they possess
- **Transitive Grant Prevention**: Cannot create permission combinations that would allow others to bypass their own limitations

### 4. Database-Level Enforcement Example

```sql
CREATE OR REPLACE FUNCTION enforce_entity_permission_boundaries()
RETURNS TRIGGER AS $$
DECLARE
  grantor_id uuid;
  has_permission boolean;
BEGIN
  -- Get current user ID from application context
  grantor_id := current_setting('app.current_user_id', true)::uuid;
  
  -- Skip check for system operations
  IF current_setting('app.system_operation', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Verify the grantor has the permission being granted
  SELECT EXISTS (
    SELECT 1 
    FROM effective_user_permissions 
    WHERE user_id = grantor_id
    AND permission_id = NEW.permission_id
    AND entity_id = NEW.entity_id
  ) INTO has_permission;
  
  IF NOT has_permission THEN
    RAISE EXCEPTION 'Permission boundary violation: Cannot grant permissions you do not possess';
  END IF;

  -- All checks passed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to role permissions table
CREATE TRIGGER enforce_permission_boundaries
BEFORE INSERT OR UPDATE ON entity_role_permissions
FOR EACH ROW EXECUTE FUNCTION enforce_entity_permission_boundaries();
```

### 5. Hierarchical Entity Permission Management

For organizations with sub-entities or departments, additional controls apply:

- **Parent-Child Relationship**: Parent entity admins can manage child entity permissions
- **Permission Flow Direction**: Permissions can only flow downward, not upward in the hierarchy
- **Scope Limitation**: Child entity admins have permissions scoped to their entity only
- **Permission Propagation**: Changes to parent entity roles can optionally propagate to children
- **Override Prevention**: Child entities cannot override restrictions set by parent entities

### 6. Permission Boundary Conflict Resolution

When conflicts arise in permission boundary scenarios:

- **Most Restrictive Wins**: In case of conflicting boundaries, the most restrictive one is applied
- **Explicit Denial Priority**: Explicit permission denials override grants
- **System Overrides**: System-critical permissions cannot be overridden by entity admins
- **Audit Trail**: All boundary conflicts are logged with full context for review

## Data Architecture

### Core Tables

1. **Entities**: Stores entity/company information
   ```
   entities(id, name, settings, created_at, updated_at)
   ```

2. **Entity Roles**: Stores entity-specific role definitions
   ```
   entity_roles(id, entity_id, name, description, is_system_derived, system_role_id, created_at, updated_at)
   ```

3. **Entity Role Permissions**: Maps entity roles to permissions
   ```
   entity_role_permissions(id, entity_id, role_id, permission_id, created_at)
   ```

4. **User Entity Roles**: Maps users to entity roles
   ```
   user_entity_roles(user_id, entity_id, role_id, assigned_by, created_at)
   ```

### Denormalized Permission Structure

For performance optimization, the system maintains denormalized permission records:

1. **User Entity Permissions**: Flattened view of permissions per user per entity
   ```
   user_entity_permissions(user_id, entity_id, resource, action, granted)
   ```

### Boundary Enforcement Tables

Additional tables specifically for boundary enforcement:

1. **Permission Grant Logs**: Records all permission grants with full context
   ```
   permission_grant_logs(id, grantor_id, grantee_id, permission_id, entity_id, granted_at, revoked_at)
   ```

2. **Entity Permission Boundaries**: Defines permission boundaries for entities
   ```
   entity_permission_boundaries(entity_id, permission_id, restricted, restriction_reason)
   ```

## Entity Boundary Integration with Audit System

To ensure consistent entity boundary enforcement across the system, the multi-tenant role architecture directly integrates with the audit logging system:

1. **Unified Entity Context Model**: 
   - Shared entity context structure between RBAC and audit systems
   - Common entity ID format and hierarchy representation
   - Consistent entity attribute schema
   - Implementation detailed in [../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md#entity-boundary-enforcement)

2. **Boundary Violation Logging**:
   - All entity boundary violations are logged using standard audit events
   - Common violation categories between RBAC and audit systems
   - Standardized violation response protocols
   - Details in [../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md#permission-boundary-conflict-resolution)

3. **Cross-System Permission Resolution**:
   - Entity boundary checks in one subsystem are recognized by all subsystems
   - Permission decisions are consistently enforced across security contexts
   - Entity context propagation throughout system interactions
   - See [../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md) for definitive implementation

## Related Documentation

- **[../RBAC_SYSTEM.md](../RBAC_SYSTEM.md)**: Overall RBAC architecture with direct permission assignment model
- **[../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)**: Definitive source for entity boundary implementation
- **[AUTH_SYSTEM.md](AUTH_SYSTEM.md)**: Authentication system integration
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: Audit logging integration with entity boundaries
- **[../CORE_ARCHITECTURE.md](../CORE_ARCHITECTURE.md)**: System-wide architectural integration
- **[../DOCUMENTATION_MAP.md](../DOCUMENTATION_MAP.md)**: Visual guide to documentation relationships
- **[../rbac/diagrams/README.md](../rbac/diagrams/README.md)**: Visual diagrams illustrating RBAC concepts

## Version History

- **1.4.0**: Added detailed standardized cross-tenant permission model (2025-05-22)
- **1.3.0**: Added entity boundary integration with audit system
- **1.2.0**: Added references to new visual diagrams for better understanding
- **1.1.0**: Added comprehensive permission boundary enforcement section with technical details
- **1.0.0**: Initial document defining multi-tenant role architecture
