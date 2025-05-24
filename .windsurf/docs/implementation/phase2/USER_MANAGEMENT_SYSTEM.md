
# Phase 2.4: User Management System

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-23

## Overview

This guide implements a comprehensive user management system with multi-tenant awareness and proper integration of permission dependencies and entity boundaries.

## Prerequisites

- Phase 2.1: Advanced RBAC with integrated dependencies operational
- Phase 2.2: Enhanced Multi-Tenant Features functional
- Phase 2.3: Enhanced Audit Logging active
- **[../../rbac/ENTITY_BOUNDARIES.md](../../rbac/ENTITY_BOUNDARIES.md)**: Entity boundary validation operational
- **[../../rbac/PERMISSION_DEPENDENCIES.md](../../rbac/PERMISSION_DEPENDENCIES.md)**: Permission dependencies functional

## User Provisioning with Dependency Validation

### Multi-Tenant User Creation
**CRITICAL**: Implement user provisioning with entity boundary validation:

```typescript
// User provisioning with entity boundary and dependency validation
async function provisionUser(
  adminUserId: string,
  userData: UserProvisioningData,
  tenantId: string,
  initialRoleId: string
): Promise<{success: boolean, violations: string[]}> {
  const violations: string[] = [];
  
  // 1. Validate admin can provision users in this tenant (entity boundary check)
  const canProvision = await canGrantPermission(
    { id: adminUserId, entityId: tenantId },
    { entityId: tenantId },
    'users:create'
  );
  
  if (!canProvision) {
    violations.push('Administrator cannot provision users in this tenant');
    return { success: false, violations };
  }
  
  // 2. Validate initial role assignment with dependencies
  const roleValidation = await validateAdvancedRoleAssignment(
    adminUserId,
    userData.id,
    initialRoleId,
    tenantId
  );
  
  if (!roleValidation.valid) {
    violations.push(...roleValidation.violations);
    return { success: false, violations };
  }
  
  // 3. Create user with proper tenant context
  const user = await createUserInTenant(userData, tenantId);
  
  // 4. Assign initial role with dependency validation
  await assignRoleWithValidation(user.id, initialRoleId, tenantId, adminUserId);
  
  // 5. Audit user provisioning
  await auditUserProvisioning(adminUserId, user.id, tenantId, initialRoleId);
  
  return { success: true, violations: [] };
}
```

### Bulk User Operations with Boundary Enforcement
**CRITICAL**: Implement bulk operations respecting entity boundaries:

```typescript
// Bulk user operations with entity boundary validation
async function bulkUserOperation(
  adminUserId: string,
  operation: 'create' | 'update' | 'delete' | 'roleAssign',
  userIds: string[],
  tenantId: string,
  operationData: any
): Promise<BulkOperationResult> {
  const results: OperationResult[] = [];
  
  // 1. Validate admin has bulk operation permission
  const canPerformBulk = await hasPermission(adminUserId, `users:${operation}Any`, tenantId);
  if (!canPerformBulk) {
    throw new Error('Insufficient permissions for bulk operations');
  }
  
  // 2. Process each user with entity boundary validation
  for (const userId of userIds) {
    try {
      // Validate entity boundary for each user
      const userInTenant = await userBelongsToTenant(userId, tenantId);
      if (!userInTenant) {
        results.push({
          userId,
          success: false,
          error: 'User not in target tenant'
        });
        continue;
      }
      
      // Perform operation with dependency validation
      await performUserOperation(adminUserId, userId, operation, operationData, tenantId);
      
      results.push({
        userId,
        success: true
      });
      
    } catch (error) {
      results.push({
        userId,
        success: false,
        error: error.message
      });
    }
  }
  
  // 3. Audit bulk operation
  await auditBulkUserOperation(adminUserId, operation, userIds, tenantId, results);
  
  return {
    totalProcessed: userIds.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}
```

## Cross-Tenant User Management

### Cross-Tenant Identity Management
Following [../../rbac/ENTITY_BOUNDARIES.md](../../rbac/ENTITY_BOUNDARIES.md) for cross-entity operations:

```typescript
// Cross-tenant user management with explicit boundary validation
async function manageCrossTenantUser(
  adminUserId: string,
  targetUserId: string,
  sourceTenantId: string,
  targetTenantId: string,
  operation: CrossTenantOperation
): Promise<void> {
  // 1. Validate cross-tenant permission
  const hasCrossTenantAccess = await hasPermission(
    adminUserId,
    'cross_entity_management',
    sourceTenantId
  );
  
  if (!hasCrossTenantAccess) {
    throw new Error('No cross-tenant management permission');
  }
  
  // 2. Validate operation in target tenant
  const canOperateInTarget = await validateCrossTenantOperation(
    adminUserId,
    targetTenantId,
    operation
  );
  
  if (!canOperateInTarget) {
    throw new Error('Cannot perform operation in target tenant');
  }
  
  // 3. Execute cross-tenant operation with audit
  await executeCrossTenantOperation(
    adminUserId,
    targetUserId,
    sourceTenantId,
    targetTenantId,
    operation
  );
  
  // 4. Log cross-entity operation
  await logCrossEntityAccess(
    adminUserId,
    sourceTenantId,
    targetTenantId,
    operation.type,
    'users',
    true
  );
}
```

## User Profile Management with Dependencies

### Tenant-Specific User Profiles
**CRITICAL**: Implement profile management with permission dependencies:

```typescript
// User profile management with dependency validation
async function updateUserProfile(
  requesterId: string,
  targetUserId: string,
  profileData: UserProfileData,
  tenantId: string
): Promise<void> {
  // 1. Check if requester can update this user's profile
  const canUpdate = requesterId === targetUserId 
    ? await hasPermission(requesterId, 'users:updateSelf', tenantId)
    : await hasPermission(requesterId, 'users:updateAny', tenantId);
  
  if (!canUpdate) {
    throw new Error('Insufficient permissions to update user profile');
  }
  
  // 2. Validate entity boundary
  const targetUserInTenant = await userBelongsToTenant(targetUserId, tenantId);
  if (!targetUserInTenant) {
    throw new Error('Target user not in current tenant');
  }
  
  // 3. Validate profile update dependencies
  if (profileData.sensitiveFields) {
    const canUpdateSensitive = await hasPermission(
      requesterId,
      'users:updateSensitive',
      tenantId
    );
    
    if (!canUpdateSensitive) {
      throw new Error('Cannot update sensitive profile fields');
    }
  }
  
  // 4. Update profile with tenant context
  await updateUserProfileInTenant(targetUserId, profileData, tenantId);
  
  // 5. Audit profile update
  await auditProfileUpdate(requesterId, targetUserId, profileData, tenantId);
}
```

## Permission Management Integration

### User Permission Analytics
**CRITICAL**: Implement permission analytics with dependency awareness:

```typescript
// User permission analytics with dependency resolution
async function getUserPermissionAnalytics(
  userId: string,
  tenantId: string
): Promise<UserPermissionAnalytics> {
  // 1. Get direct permissions
  const directPermissions = await getUserDirectPermissions(userId, tenantId);
  
  // 2. Resolve permission dependencies
  const effectivePermissions = new Set<string>();
  
  for (const permission of directPermissions) {
    effectivePermissions.add(`${permission.resource}:${permission.action}`);
    
    // Add implied permissions from dependencies
    const dependencies = await getImpliedPermissions(permission.action, permission.resource);
    dependencies.forEach(dep => effectivePermissions.add(`${dep.resource}:${dep.action}`));
  }
  
  // 3. Analyze permission coverage
  const permissionCoverage = await analyzePermissionCoverage(
    Array.from(effectivePermissions),
    tenantId
  );
  
  // 4. Check for permission conflicts
  const conflicts = await detectPermissionConflicts(directPermissions);
  
  return {
    directPermissionCount: directPermissions.length,
    effectivePermissionCount: effectivePermissions.size,
    permissionCoverage,
    conflicts,
    riskScore: calculatePermissionRiskScore(effectivePermissions),
    entityBoundaryViolations: await checkEntityBoundaryViolations(userId, tenantId)
  };
}
```

## Testing Requirements

**CRITICAL Testing for Dependencies and Boundaries:**
- Test user provisioning respects entity boundaries
- Verify permission dependencies are enforced in user operations
- Test cross-tenant operations require explicit permissions
- Validate bulk operations respect entity boundaries
- Test permission analytics include dependency resolution
- Verify audit logging captures boundary violations

## Success Criteria

✅ User provisioning system with entity boundary validation operational  
✅ **CRITICAL**: Permission dependencies integrated into all user operations  
✅ **CRITICAL**: Entity boundary validation enforced for all user management  
✅ Cross-tenant user management with explicit permissions functional  
✅ Tenant-specific user profiles operational  
✅ User permission analytics with dependency awareness active  
✅ Bulk operations with boundary enforcement working  

## Next Steps

Continue to [Phase 3](../PHASE3_FEATURES.md) with comprehensive user management foundation.

## Related Documentation

- [../../user-management/RBAC_INTEGRATION.md](../../user-management/RBAC_INTEGRATION.md): User-RBAC integration
- [../../rbac/ENTITY_BOUNDARIES.md](../../rbac/ENTITY_BOUNDARIES.md): **MANDATORY** - Entity boundary validation
- [../../rbac/PERMISSION_DEPENDENCIES.md](../../rbac/PERMISSION_DEPENDENCIES.md): **MANDATORY** - Permission dependencies
- [../../multitenancy/IMPLEMENTATION_EXAMPLES.md](../../multitenancy/IMPLEMENTATION_EXAMPLES.md): Implementation examples

## Version History

- **1.1.0**: Integrated permission dependencies and entity boundary validation throughout (2025-05-23)
- **1.0.0**: Initial user management system guide (2025-05-23)
