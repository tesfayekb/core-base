
# Advanced Integration Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document covers advanced integration testing patterns including end-to-end flows, complex multi-tenant scenarios, and sophisticated testing strategies.

## End-to-End Flow Integration

### Complete User Onboarding Flow

```typescript
describe('User Onboarding Flow', () => {
  test('should complete full onboarding process', async () => {
    // 1. Register new user
    const { userId, verificationToken } = await authService.register({
      email: 'new-user@example.com',
      password: 'securePassword123'
    });
    
    // 2. Verify email
    await authService.verifyEmail(verificationToken);
    
    // 3. Complete profile
    await userService.updateProfile(userId, {
      name: 'New User',
      jobTitle: 'Developer'
    });
    
    // 4. Join organization
    const orgId = await organizationService.createOrganization('Test Org');
    await organizationService.addMember(orgId, userId);
    
    // 5. Verify permissions in organization context
    const hasOrgPermission = await permissionService.checkPermission({
      userId,
      tenantId: orgId,
      resourceType: 'projects',
      action: 'view'
    });
    
    expect(hasOrgPermission).toBe(true);
    
    // 6. Clean up
    await userService.deleteUser(userId);
    await organizationService.deleteOrganization(orgId);
  });
});
```

### Complex Permission Change Flow

```typescript
describe('Complex Permission Change Flow', () => {
  test('should handle cascading permission updates', async () => {
    // 1. Set up organization hierarchy
    const parentOrgId = await organizationService.createOrganization('Parent Org');
    const childOrgId = await organizationService.createOrganization('Child Org', {
      parentId: parentOrgId
    });
    
    // 2. Create users at different levels
    const adminUserId = await userService.createUser({ email: 'admin@parent.com' });
    const managerUserId = await userService.createUser({ email: 'manager@child.com' });
    
    // 3. Set up initial roles and permissions
    await roleService.assignRoleInTenant(adminUserId, 'org-admin', parentOrgId);
    await roleService.assignRoleInTenant(managerUserId, 'manager', childOrgId);
    
    // 4. Modify parent organization permissions
    const adminRoleId = await roleService.getRoleByName('org-admin');
    await roleService.addPermissionToRole(adminRoleId, 'users.delete');
    
    // 5. Verify cascading permission updates
    const adminPermissions = await permissionService.getUserPermissions(adminUserId, parentOrgId);
    const managerPermissions = await permissionService.getUserPermissions(managerUserId, childOrgId);
    
    expect(adminPermissions).toContain('users.delete');
    expect(managerPermissions).not.toContain('users.delete'); // Should not cascade down
    
    // 6. Clean up
    await organizationService.deleteOrganization(childOrgId);
    await organizationService.deleteOrganization(parentOrgId);
    await userService.deleteUser(adminUserId);
    await userService.deleteUser(managerUserId);
  });
});
```

## Advanced Multi-tenant Testing

### Cross-tenant Permission Inheritance

```typescript
describe('Cross-tenant Permission Inheritance', () => {
  test('should handle complex tenant relationships', async () => {
    // 1. Create tenant hierarchy
    const corporateId = await tenantService.createTenant('Corporate');
    const division1Id = await tenantService.createTenant('Division 1', { parentId: corporateId });
    const division2Id = await tenantService.createTenant('Division 2', { parentId: corporateId });
    
    // 2. Create user with corporate access
    const userId = await userService.createUser({ email: 'corporate@example.com' });
    await tenantService.addUserToTenant(userId, corporateId);
    
    // 3. Grant corporate-level permissions
    await roleService.assignRoleInTenant(userId, 'corporate-admin', corporateId);
    
    // 4. Test access to child tenants
    const canAccessDiv1 = await permissionService.checkPermission({
      userId,
      tenantId: division1Id,
      resourceType: 'reports',
      action: 'view'
    });
    
    const canAccessDiv2 = await permissionService.checkPermission({
      userId,
      tenantId: division2Id,
      resourceType: 'reports',
      action: 'view'
    });
    
    expect(canAccessDiv1).toBe(true);
    expect(canAccessDiv2).toBe(true);
    
    // 5. Test cross-division isolation
    await documentService.createDocument({
      tenantId: division1Id,
      title: 'Division 1 Doc',
      confidential: true
    });
    
    const div2User = await userService.createUser({ email: 'div2@example.com' });
    await tenantService.addUserToTenant(div2User, division2Id);
    
    const canAccessDiv1Doc = await permissionService.checkPermission({
      userId: div2User,
      tenantId: division1Id,
      resourceType: 'documents',
      action: 'view'
    });
    
    expect(canAccessDiv1Doc).toBe(false);
    
    // 6. Clean up
    await tenantService.deleteTenant(division1Id);
    await tenantService.deleteTenant(division2Id);
    await tenantService.deleteTenant(corporateId);
    await userService.deleteUser(userId);
    await userService.deleteUser(div2User);
  });
});
```

### Concurrent Multi-tenant Operations

```typescript
describe('Concurrent Multi-tenant Operations', () => {
  test('should handle simultaneous operations across tenants', async () => {
    // 1. Set up multiple tenants
    const tenantIds = await Promise.all([
      tenantService.createTenant('Tenant A'),
      tenantService.createTenant('Tenant B'),
      tenantService.createTenant('Tenant C')
    ]);
    
    // 2. Create users for each tenant
    const userPromises = tenantIds.map(async (tenantId, index) => {
      const userId = await userService.createUser({
        email: `user${index}@tenant${index}.com`
      });
      await tenantService.addUserToTenant(userId, tenantId);
      return { userId, tenantId };
    });
    
    const users = await Promise.all(userPromises);
    
    // 3. Perform concurrent operations
    const operationPromises = users.map(async ({ userId, tenantId }) => {
      // Create documents concurrently
      const doc = await documentService.createDocument({
        tenantId,
        title: `Document for ${tenantId}`,
        createdBy: userId
      });
      
      // Update permissions concurrently
      await roleService.assignRoleInTenant(userId, 'editor', tenantId);
      
      return { userId, tenantId, documentId: doc.id };
    });
    
    const results = await Promise.all(operationPromises);
    
    // 4. Verify isolation maintained during concurrent operations
    for (const { userId, tenantId, documentId } of results) {
      const userDocs = await documentService.listDocuments({
        userId,
        tenantId
      });
      
      expect(userDocs.length).toBe(1);
      expect(userDocs[0].id).toBe(documentId);
      
      // Verify user cannot see other tenants' documents
      const otherTenants = tenantIds.filter(id => id !== tenantId);
      for (const otherTenantId of otherTenants) {
        const otherDocs = await documentService.listDocuments({
          userId,
          tenantId: otherTenantId
        });
        expect(otherDocs.length).toBe(0);
      }
    }
    
    // 5. Clean up
    await Promise.all([
      ...tenantIds.map(id => tenantService.deleteTenant(id)),
      ...users.map(({ userId }) => userService.deleteUser(userId))
    ]);
  });
});
```

## Event-Driven Integration Testing

### Cross-Component Event Propagation

```typescript
describe('Event-Driven Integration', () => {
  test('should propagate events across components correctly', async () => {
    // 1. Set up event listeners
    const auditEvents: any[] = [];
    const permissionEvents: any[] = [];
    
    eventService.subscribe('audit.*', (event) => auditEvents.push(event));
    eventService.subscribe('permission.*', (event) => permissionEvents.push(event));
    
    // 2. Perform actions that should trigger events
    const userId = await userService.createUser({ email: 'event-test@example.com' });
    const roleId = await roleService.createRole('Event Test Role');
    
    await roleService.assignRoleToUser(userId, roleId);
    await roleService.addPermissionToRole(roleId, 'documents.create');
    
    // 3. Wait for event propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 4. Verify events were generated and propagated
    expect(auditEvents.length).toBeGreaterThan(0);
    expect(permissionEvents.length).toBeGreaterThan(0);
    
    const userRoleEvent = auditEvents.find(e => 
      e.eventType === 'user.role.assigned' && e.userId === userId
    );
    
    expect(userRoleEvent).toBeDefined();
    expect(userRoleEvent.metadata.roleId).toBe(roleId);
    
    // 5. Clean up
    await roleService.deleteRole(roleId);
    await userService.deleteUser(userId);
  });
});
```

## Performance Integration Testing

### Permission Resolution Performance

```typescript
describe('Permission Resolution Performance', () => {
  test('should resolve permissions efficiently under load', async () => {
    // 1. Set up complex permission structure
    const tenantId = await tenantService.createTenant('Performance Test Tenant');
    const userIds = [];
    
    // Create 100 users with various roles
    for (let i = 0; i < 100; i++) {
      const userId = await userService.createUser({
        email: `perf-user-${i}@example.com`
      });
      userIds.push(userId);
      
      await tenantService.addUserToTenant(userId, tenantId);
      await roleService.assignRoleInTenant(userId, i % 3 === 0 ? 'admin' : 'user', tenantId);
    }
    
    // 2. Measure permission resolution performance
    const startTime = Date.now();
    
    const permissionChecks = userIds.map(userId =>
      permissionService.checkPermission({
        userId,
        tenantId,
        resourceType: 'documents',
        action: 'view'
      })
    );
    
    const results = await Promise.all(permissionChecks);
    const endTime = Date.now();
    
    // 3. Verify performance requirements
    const totalTime = endTime - startTime;
    const avgTimePerCheck = totalTime / results.length;
    
    expect(avgTimePerCheck).toBeLessThan(10); // Less than 10ms per permission check
    expect(results.every(result => typeof result === 'boolean')).toBe(true);
    
    // 4. Clean up
    await tenantService.deleteTenant(tenantId);
    await Promise.all(userIds.map(id => userService.deleteUser(id)));
  });
});
```

## Integration Test Coverage Matrix

| Integration Type | Test Coverage | Performance Requirement |
|------------------|---------------|------------------------|
| Auth + RBAC | Login permission context | < 100ms |
| RBAC + Tenant | Tenant-specific permissions | < 50ms |
| Audit + All | Event propagation | < 200ms |
| End-to-End Flows | Complete user journeys | < 2s |
| Concurrent Operations | Multi-tenant isolation | No race conditions |

## Related Documentation

- **[CORE_COMPONENT_INTEGRATION.md](docs/testing/CORE_COMPONENT_INTEGRATION.md)**: Basic component integration tests
- **[INTEGRATION_TEST_ENVIRONMENT.md](docs/testing/INTEGRATION_TEST_ENVIRONMENT.md)**: Test environment setup
- **[PERFORMANCE_STANDARDS.md](docs/PERFORMANCE_STANDARDS.md)**: Performance benchmarks
- **[TEST_FRAMEWORK.md](docs/TEST_FRAMEWORK.md)**: Overall testing framework

## Version History

- **1.0.0**: Extracted advanced integration patterns from INTEGRATION_TESTING.md (2025-05-23)
