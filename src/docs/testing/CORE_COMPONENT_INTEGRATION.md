
# Core Component Integration Testing

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document focuses on testing interactions between closely related components within the same subsystem and critical cross-subsystem integrations.

## Component-to-Component Integration

Tests that verify interactions between closely related components within the same subsystem:

### RBAC and User Management Integration

```typescript
describe('RBAC and User Management Integration', () => {
  test('should assign correct permissions when user role changes', async () => {
    // 1. Set up user with initial role
    const { userId } = await userService.createUser({
      email: 'test@example.com',
      name: 'Test User'
    });
    
    await roleService.assignRole(userId, 'basic-user');
    
    // 2. Verify initial permissions
    const initialPermissions = await permissionService.getUserPermissions(userId);
    expect(initialPermissions).toContain('documents.view');
    expect(initialPermissions).not.toContain('users.manage');
    
    // 3. Change user role
    await roleService.assignRole(userId, 'admin-user');
    
    // 4. Verify updated permissions
    const updatedPermissions = await permissionService.getUserPermissions(userId);
    expect(updatedPermissions).toContain('documents.view');
    expect(updatedPermissions).toContain('users.manage');
    
    // 5. Clean up
    await userService.deleteUser(userId);
  });
});
```

### Authentication and Session Management Integration

```typescript
describe('Authentication and Session Management', () => {
  test('should properly create and verify sessions', async () => {
    // 1. Register and login
    await authService.register({
      email: 'session-test@example.com',
      password: 'session123'
    });
    
    const { session } = await authService.login({
      email: 'session-test@example.com',
      password: 'session123'
    });
    
    // 2. Verify session token
    const isValid = await authService.verifySession(session.token);
    expect(isValid).toBe(true);
    
    // 3. Verify session includes user data
    const sessionData = await authService.getSessionData(session.token);
    expect(sessionData.email).toBe('session-test@example.com');
    
    // 4. Verify session expiry
    jest.advanceTimersByTime(60 * 60 * 1000 + 1); // 1 hour + 1ms
    const isExpired = await authService.verifySession(session.token);
    expect(isExpired).toBe(false);
  });
});
```

## Critical Subsystem Integration

### Authentication, RBAC, and Multi-tenant Integration

```typescript
describe('Authentication, RBAC, and Multi-tenant Integration', () => {
  test('should set tenant context when user logs in', async () => {
    // 1. Create test user with tenant access
    const { userId } = await userService.createUser({
      email: 'tenant-test@example.com',
      name: 'Tenant Test User'
    });
    
    const tenantId = await tenantService.createTenant('Test Tenant');
    await tenantService.addUserToTenant(userId, tenantId);
    
    // 2. Perform login
    const { session } = await authService.login({
      email: 'tenant-test@example.com',
      password: 'password123'
    });
    
    // 3. Verify tenant context is set
    const currentTenant = await tenantService.getCurrentTenant(session);
    expect(currentTenant.id).toBe(tenantId);
    
    // 4. Verify permissions include tenant context
    const hasPermission = await permissionService.checkPermission({
      userId,
      tenantId,
      resourceType: 'documents',
      action: 'view'
    });
    
    expect(hasPermission).toBe(true);
    
    // 5. Clean up
    await userService.deleteUser(userId);
    await tenantService.deleteTenant(tenantId);
  });
});
```

### RBAC and Audit Integration

```typescript
describe('RBAC and Audit Integration', () => {
  test('should log permission changes in audit log', async () => {
    // 1. Set up user and role
    const userId = await userService.createUser({ email: 'audit-test@example.com' });
    const roleId = await roleService.createRole('Test Role');
    
    // 2. Track audit log position
    const auditStartPosition = await auditService.getLastEventId();
    
    // 3. Make permission change
    await roleService.assignPermissionToRole(roleId, 'documents.edit');
    await roleService.assignRoleToUser(userId, roleId);
    
    // 4. Verify audit log entry
    const auditEvents = await auditService.getEventsSince(auditStartPosition);
    
    const permissionEvent = auditEvents.find(
      e => e.eventType === 'permission.change' && e.userId === userId
    );
    
    expect(permissionEvent).toBeDefined();
    expect(permissionEvent.metadata.permission).toBe('documents.edit');
    expect(permissionEvent.metadata.roleId).toBe(roleId);
    
    // 5. Clean up
    await roleService.deleteRole(roleId);
    await userService.deleteUser(userId);
  });
});
```

## Multi-tenant Data Isolation Testing

### Basic Isolation Testing

```typescript
describe('Multi-tenant Data Isolation', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let user1Id: string;
  let user2Id: string;
  
  beforeAll(async () => {
    // Set up two tenants and users
    tenant1Id = await tenantService.createTenant('Tenant 1');
    tenant2Id = await tenantService.createTenant('Tenant 2');
    
    user1Id = await userService.createUser({ email: 'user1@tenant1.com' });
    user2Id = await userService.createUser({ email: 'user2@tenant2.com' });
    
    await tenantService.addUserToTenant(user1Id, tenant1Id);
    await tenantService.addUserToTenant(user2Id, tenant2Id);
    
    // Create tenant-specific data
    await documentService.createDocument({
      tenantId: tenant1Id,
      title: 'Tenant 1 Document',
      content: 'Content for tenant 1'
    });
    
    await documentService.createDocument({
      tenantId: tenant2Id,
      title: 'Tenant 2 Document',
      content: 'Content for tenant 2'
    });
  });
  
  test('users should only see their tenant data', async () => {
    // User 1 in Tenant 1
    const user1Docs = await documentService.listDocuments({
      userId: user1Id,
      tenantId: tenant1Id
    });
    
    expect(user1Docs.length).toBe(1);
    expect(user1Docs[0].title).toBe('Tenant 1 Document');
    
    // User 2 in Tenant 2
    const user2Docs = await documentService.listDocuments({
      userId: user2Id,
      tenantId: tenant2Id
    });
    
    expect(user2Docs.length).toBe(1);
    expect(user2Docs[0].title).toBe('Tenant 2 Document');
  });
  
  test('users cannot access other tenant data', async () => {
    // User 1 trying to access Tenant 2
    const result = await documentService.listDocuments({
      userId: user1Id,
      tenantId: tenant2Id
    });
    
    expect(result.length).toBe(0);
  });
  
  afterAll(async () => {
    // Clean up
    await tenantService.deleteTenant(tenant1Id);
    await tenantService.deleteTenant(tenant2Id);
    await userService.deleteUser(user1Id);
    await userService.deleteUser(user2Id);
  });
});
```

## Integration Test Coverage Requirements

Integration tests should cover:

1. **Authentication Flow Integration**: Login, session management, logout
2. **Permission Resolution**: RBAC with multi-tenant context
3. **Data Isolation**: Tenant boundary enforcement
4. **Audit Trail Integration**: Permission changes and access logging
5. **Error Propagation**: Cross-component error handling

## Related Documentation

- **[ADVANCED_INTEGRATION_PATTERNS.md](ADVANCED_INTEGRATION_PATTERNS.md)**: Advanced integration testing patterns
- **[INTEGRATION_TEST_ENVIRONMENT.md](INTEGRATION_TEST_ENVIRONMENT.md)**: Test environment setup and configuration
- **[../rbac/TESTING_STRATEGY.md](../rbac/TESTING_STRATEGY.md)**: RBAC-specific testing
- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Overall testing framework

## Version History

- **1.0.0**: Extracted core component integration tests from INTEGRATION_TESTING.md (2025-05-23)
