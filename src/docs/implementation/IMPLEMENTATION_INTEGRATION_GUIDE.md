
# Implementation Integration Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This guide ensures proper integration of critical RBAC dependencies throughout the implementation process. It addresses the gap between documented permission models and implementation steps.

## Critical Dependencies Integration

### MANDATORY Prerequisites for All RBAC Implementation

Before implementing any RBAC features, developers MUST understand and implement:

1. **[../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)** - Canonical entity boundary validation patterns
2. **[../rbac/PERMISSION_DEPENDENCIES.md](../rbac/PERMISSION_DEPENDENCIES.md)** - Functional permission relationships
3. **[../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md)** - Multi-tenant query patterns

### Integration Checkpoints

#### Phase 1.4: RBAC Foundation
**CRITICAL**: Before proceeding, validate:
- [ ] Permission dependency checking implemented per PERMISSION_DEPENDENCIES.md
- [ ] Entity boundary validation implemented per ENTITY_BOUNDARIES.md
- [ ] All permission checks include dependency resolution
- [ ] Role assignment validates entity boundaries

#### Phase 2.1: Advanced RBAC
**CRITICAL**: Before proceeding, validate:
- [ ] Advanced permission dependencies functional
- [ ] Complex entity boundary scenarios handled
- [ ] Cross-resource permission relationships working
- [ ] Cache invalidation includes dependency and boundary changes

#### Phase 2.4: User Management
**CRITICAL**: Before proceeding, validate:
- [ ] User provisioning respects entity boundaries
- [ ] Permission analytics include dependency resolution
- [ ] Cross-tenant operations validate boundaries
- [ ] Bulk operations enforce entity constraints

## Implementation Pattern Template

### Permission Check Implementation Template

```typescript
// MANDATORY: Use this pattern for ALL permission checks
async function checkPermissionComplete(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  entityId?: string
): Promise<boolean> {
  // 1. Entity boundary validation (MANDATORY)
  if (entityId && !await validateEntityBoundary(userId, entityId)) {
    return false;
  }
  
  // 2. Direct permission check
  if (await hasDirectPermission(userId, action, resource, resourceId)) {
    return true;
  }
  
  // 3. Permission dependency resolution (MANDATORY)
  return await resolvePermissionDependencies(userId, action, resource, resourceId);
}
```

### Role Assignment Validation Template

```typescript
// MANDATORY: Use this pattern for ALL role assignments
async function assignRoleComplete(
  assignerId: string,
  assigneeId: string,
  roleId: string,
  entityId: string
): Promise<void> {
  // 1. Entity boundary validation (MANDATORY)
  const boundaryValidation = await validateEntityBoundary(assignerId, entityId);
  if (!boundaryValidation) {
    throw new Error('Entity boundary violation');
  }
  
  // 2. Permission dependency validation (MANDATORY)
  const dependencyValidation = await validateRoleDependencies(assignerId, roleId);
  if (!dependencyValidation.valid) {
    throw new Error(`Dependency violations: ${dependencyValidation.violations.join(', ')}`);
  }
  
  // 3. Execute assignment
  await executeRoleAssignment(assigneeId, roleId, entityId);
  
  // 4. Audit with boundary context
  await auditRoleAssignment(assignerId, assigneeId, roleId, entityId);
}
```

## Validation Requirements

### Pre-Implementation Validation

Before starting any phase, run these validation checks:

```typescript
// Validation suite for RBAC implementation readiness
interface ValidationResult {
  dependenciesImplemented: boolean;
  boundariesImplemented: boolean;
  integrationComplete: boolean;
  violations: string[];
}

async function validateRBACImplementationReadiness(): Promise<ValidationResult> {
  const violations: string[] = [];
  
  // 1. Check permission dependency implementation
  const dependenciesImplemented = await validatePermissionDependencies();
  if (!dependenciesImplemented) {
    violations.push('Permission dependencies not properly implemented');
  }
  
  // 2. Check entity boundary implementation
  const boundariesImplemented = await validateEntityBoundaries();
  if (!boundariesImplemented) {
    violations.push('Entity boundaries not properly implemented');
  }
  
  // 3. Check integration completeness
  const integrationComplete = await validateIntegration();
  if (!integrationComplete) {
    violations.push('RBAC integration incomplete');
  }
  
  return {
    dependenciesImplemented,
    boundariesImplemented,
    integrationComplete,
    violations
  };
}
```

### Testing Requirements

Each implementation phase MUST include tests for:

1. **Permission Dependencies**:
   - Test implied permissions work correctly
   - Verify dependency chains resolve properly
   - Test dependency conflicts are detected

2. **Entity Boundaries**:
   - Test cross-entity access prevention
   - Verify entity administrators cannot exceed boundaries
   - Test audit logging of boundary violations

3. **Integration**:
   - Test permission checks include all validation
   - Verify role assignments validate dependencies and boundaries
   - Test cache invalidation includes all contexts

## Common Integration Mistakes

### Avoid These Patterns

❌ **DON'T**: Implement permission checks without dependency resolution
❌ **DON'T**: Skip entity boundary validation in cross-tenant operations
❌ **DON'T**: Cache permissions without considering dependencies
❌ **DON'T**: Implement role assignment without validating grantor permissions

### Use These Patterns Instead

✅ **DO**: Always include dependency resolution in permission checks
✅ **DO**: Validate entity boundaries for all cross-entity operations
✅ **DO**: Include dependency context in permission caching
✅ **DO**: Validate grantor has all permissions being granted

## Related Documentation

- **[phase1/RBAC_FOUNDATION.md](phase1/RBAC_FOUNDATION.md)**: Updated with critical dependencies
- **[phase2/ADVANCED_RBAC.md](phase2/ADVANCED_RBAC.md)**: Updated with advanced integration
- **[../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)**: Canonical boundary implementation
- **[../rbac/PERMISSION_DEPENDENCIES.md](../rbac/PERMISSION_DEPENDENCIES.md)**: Permission relationships

## Version History

- **1.0.0**: Initial integration guide addressing critical dependency gaps (2025-05-23)
