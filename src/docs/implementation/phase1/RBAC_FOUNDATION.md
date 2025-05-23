
# Phase 1.4: Basic RBAC Implementation

> **Version**: 1.2.0  
> **Last Updated**: 2025-05-23

## Overview

This guide covers basic RBAC system implementation using the direct permission assignment model with SuperAdmin and BasicUser roles. This builds on authentication from Phase 1.3.

## Prerequisites

Before implementing RBAC, ensure you understand these critical dependencies:
- **[../../rbac/ENTITY_BOUNDARIES.md](../../rbac/ENTITY_BOUNDARIES.md)**: Entity boundary validation patterns (MANDATORY)
- **[../../rbac/PERMISSION_DEPENDENCIES.md](../../rbac/PERMISSION_DEPENDENCIES.md)**: Functional permission relationships (MANDATORY)
- Phase 1.3: Authentication Implementation completed

## Direct Permission Model Foundation

### Direct Assignment Model
Following [../../rbac/ROLE_ARCHITECTURE.md](../../rbac/ROLE_ARCHITECTURE.md):

**Core Principle:** Direct permission assignment without role hierarchy
- Users assigned directly to roles
- Roles contain direct permission assignments
- No role inheritance or hierarchical permissions
- Clear, flat permission resolution path

### Permission Dependencies Integration
**CRITICAL**: Before implementing any permission checks, implement the functional dependencies from [../../rbac/PERMISSION_DEPENDENCIES.md](../../rbac/PERMISSION_DEPENDENCIES.md):

```typescript
// Implement permission dependency checking from PERMISSION_DEPENDENCIES.md
function checkPermissionWithDependencies(user, action, resource, resourceId) {
  // Direct permission check
  if (hasExplicitPermission(user, action, resource, resourceId)) {
    return true;
  }
  
  // Check for higher-level permissions that imply this one (from PERMISSION_DEPENDENCIES.md)
  if (action === 'view' && hasExplicitPermission(user, 'update', resource, resourceId)) {
    return true;
  }
  
  if (action === 'view' && hasExplicitPermission(user, 'delete', resource, resourceId)) {
    return true;
  }
  
  // Special case for "Any" permissions
  if (resourceId && hasExplicitPermission(user, `${action}Any`, resource)) {
    return true;
  }
  
  return false;
}
```

### Entity Boundary Validation
**CRITICAL**: Implement entity boundary validation from [../../rbac/ENTITY_BOUNDARIES.md](../../rbac/ENTITY_BOUNDARIES.md):

```typescript
// Implement canonical permission grant validation from ENTITY_BOUNDARIES.md
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

## Basic Role Definitions

### SuperAdmin Role
- Universal system access
- All permission types granted directly
- System administration capabilities
- User and role management permissions
- **CRITICAL**: SuperAdmin can grant any permission they possess (entity boundary rule)

### BasicUser Role
- Limited application access
- Read permissions for owned resources
- Basic profile management
- No administrative capabilities
- **CRITICAL**: Cannot grant permissions to other users

## Permission Types Implementation
Following [../../rbac/PERMISSION_TYPES.md](../../rbac/PERMISSION_TYPES.md):

### Core Permission Categories
- **SYSTEM**: System-level operations
- **USER**: User management operations  
- **RESOURCE**: Resource-specific operations
- **AUDIT**: Audit log access

### Action Types with Dependencies
**CRITICAL**: Implement these with functional dependencies from PERMISSION_DEPENDENCIES.md:

- **VIEW**: Read access to resources
- **CREATE**: Create new resources
- **UPDATE**: Modify existing resources (implies VIEW capability)
- **DELETE**: Remove resources (implies VIEW capability)
- **MANAGE**: Full administrative access (implies UPDATE, VIEW capabilities)

**Testing Requirements:**
- Test SuperAdmin role has universal access
- Verify BasicUser role has limited permissions
- **CRITICAL**: Test permission dependencies work correctly
- **CRITICAL**: Test entity boundary validation prevents unauthorized grants
- Test direct permission checking mechanisms  
- Validate role assignment and removal

## Direct Permission Resolution Foundation

### Basic Permission Checking with Dependencies
Using [../../rbac/permission-resolution/CORE_ALGORITHM.md](../../rbac/permission-resolution/CORE_ALGORITHM.md) plus dependency integration:

**Direct Resolution Steps:**
1. Get user's directly assigned roles
2. Collect all permissions from roles (union approach)
3. **CRITICAL**: Apply permission dependencies from PERMISSION_DEPENDENCIES.md
4. Check specific permission exists in union
5. **CRITICAL**: Apply entity boundary rules from ENTITY_BOUNDARIES.md

### Entity Boundaries Integration
Following [../../rbac/ENTITY_BOUNDARIES.md](../../rbac/ENTITY_BOUNDARIES.md):

- User can only access owned resources
- System admins can access all resources
- **CRITICAL**: Entity administrators cannot grant permissions they don't have
- **CRITICAL**: Permission grants validated against grantor's permissions
- Tenant-specific resource boundaries
- Resource ownership validation

## Permission Infrastructure

### Direct Permission Checking Service with Dependencies
- Centralized permission validation using direct assignment model
- **CRITICAL**: Integrated permission dependency resolution
- **CRITICAL**: Entity boundary validation on all permission grants
- Cacheable permission queries
- Performance-optimized lookups
- Consistent error handling

### Database Implementation
**CRITICAL**: Implement Row Level Security policies that enforce entity boundaries:

```sql
-- Entity boundary enforcement from ENTITY_BOUNDARIES.md
CREATE POLICY entity_boundary_policy ON entity_resources
  USING (
    entity_id = public.get_current_entity_id() OR 
    public.user_has_permission(auth.uid(), 'cross_entity_access', 'entities')
  );
```

### UI Integration Foundation
Using [../../rbac/permission-resolution/UI_INTEGRATION.md](../../rbac/permission-resolution/UI_INTEGRATION.md):

**Direct Permission-Based Rendering:**
- Conditional component display based on direct permissions
- **CRITICAL**: UI respects permission dependencies
- Permission-aware navigation
- Action button visibility
- Menu item filtering

### Basic Caching
Following [../../rbac/CACHING_STRATEGY.md](../../rbac/CACHING_STRATEGY.md):

- Memory-based permission cache
- Session-level caching for user permissions
- **CRITICAL**: Cache invalidation on role changes
- **CRITICAL**: Cache invalidation on entity boundary changes
- Performance monitoring setup

**Testing Requirements:**
- Test direct permission checking performance
- Verify cache effectiveness
- **CRITICAL**: Test permission dependency resolution
- **CRITICAL**: Test entity boundary enforcement
- Test cache invalidation scenarios
- Validate UI permission rendering

## Success Criteria

✅ SuperAdmin role grants universal access  
✅ BasicUser role properly restricted  
✅ **CRITICAL**: Permission dependencies correctly implemented per PERMISSION_DEPENDENCIES.md  
✅ **CRITICAL**: Entity boundary validation enforced per ENTITY_BOUNDARIES.md  
✅ Direct permission checking service operational  
✅ Entity boundaries enforced  
✅ UI renders based on direct permissions  
✅ Basic caching functional  
✅ Direct role assignment/removal working  

## Next Steps

Continue to [SECURITY_INFRASTRUCTURE.md](SECURITY_INFRASTRUCTURE.md) for security and audit setup.

## Related Documentation

- [../../rbac/ROLE_ARCHITECTURE.md](../../rbac/ROLE_ARCHITECTURE.md): Direct role architecture principles
- [../../rbac/PERMISSION_TYPES.md](../../rbac/PERMISSION_TYPES.md): Permission type definitions
- [../../rbac/PERMISSION_DEPENDENCIES.md](../../rbac/PERMISSION_DEPENDENCIES.md): **MANDATORY** - Functional permission relationships
- [../../rbac/ENTITY_BOUNDARIES.md](../../rbac/ENTITY_BOUNDARIES.md): **MANDATORY** - Entity boundary validation
- [../../rbac/permission-resolution/CORE_ALGORITHM.md](../../rbac/permission-resolution/CORE_ALGORITHM.md): Direct permission resolution

## Version History

- **1.2.0**: Integrated critical dependencies for permission dependencies and entity boundaries (2025-05-23)
- **1.1.0**: Updated to align with direct permission assignment model (2025-05-23)
- **1.0.0**: Initial basic RBAC implementation guide (2025-05-23)
