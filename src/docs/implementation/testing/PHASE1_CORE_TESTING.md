
# Phase 1: Core Foundation Testing

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Essential testing for Phase 1 foundation components: Database, Authentication, Basic RBAC, Multi-Tenant.

## Performance Targets

```typescript
const phase1Targets = {
  database: {
    connectionTime: 100,      // ms
    queryExecution: 50,       // ms for simple queries
  },
  authentication: {
    loginTime: 1000,          // ms
    tokenValidation: 10,      // ms
  },
  basicRBAC: {
    permissionCheck: 15,      // ms (uncached)
    roleAssignment: 100,      // ms
  },
  multiTenant: {
    tenantSwitching: 200,     // ms
    queryFiltering: 5         // ms overhead
  }
};
```

## Database Foundation Testing

### Schema Validation
```typescript
describe('Database Foundation', () => {
  test('should create all required tables', async () => {
    const tables = await testDb.getTables();
    const requiredTables = ['users', 'tenants', 'roles', 'user_roles', 'audit_logs'];
    
    requiredTables.forEach(tableName => {
      expect(tables).toContain(tableName);
    });
  });

  test('should enforce Row Level Security', async () => {
    const rlsStatus = await testDb.checkRLSStatus();
    
    expect(rlsStatus.users).toBe(true);
    expect(rlsStatus.tenants).toBe(true);
  });
});
```

## Authentication Testing

### Core Authentication Flow
```typescript
describe('Authentication System', () => {
  test('should complete registration within time limit', async () => {
    const startTime = performance.now();
    
    const result = await authService.register({
      email: 'newuser@example.com',
      password: 'SecurePassword123!'
    });

    const registrationTime = performance.now() - startTime;
    expect(registrationTime).toBeLessThan(phase1Targets.authentication.loginTime);
    expect(result.user.email).toBe('newuser@example.com');
  });
});
```

## RBAC Testing

### Basic Permission Checks
```typescript
describe('Basic RBAC', () => {
  test('should assign role within performance target', async () => {
    const startTime = performance.now();
    
    await rbacService.assignRole(testUser.id, 'basic-user', testTenant.id);
    
    const assignmentTime = performance.now() - startTime;
    expect(assignmentTime).toBeLessThan(phase1Targets.basicRBAC.roleAssignment);
  });
});
```

## Multi-Tenant Testing

### Tenant Isolation
```typescript
describe('Multi-Tenant Foundation', () => {
  test('should enforce tenant isolation', async () => {
    const tenant1 = await createTestTenant();
    const tenant2 = await createTestTenant();
    
    const user1 = await createTestUser({ tenantId: tenant1.id });
    
    const user1Docs = await testDb.documents.findByTenant(tenant1.id);
    const user2Docs = await testDb.documents.findByTenant(tenant2.id);
    
    // Should not see cross-tenant data
    expect(user1Docs.some(doc => doc.tenantId === tenant2.id)).toBe(false);
  });
});
```

## Integration Validation

### Phase 1 Complete Integration
```typescript
describe('Phase 1 Integration', () => {
  test('should complete full foundation flow', async () => {
    // Register → Verify → Login → Create Tenant → Assign Role
    const user = await authService.register({
      email: 'integration@example.com',
      password: 'SecurePassword123!'
    });
    
    await authService.verifyEmail(user.verificationToken);
    const session = await authService.login({
      email: 'integration@example.com',
      password: 'SecurePassword123!'
    });
    
    const tenant = await tenantService.create({
      name: 'Test Org',
      ownerId: user.user.id
    });
    
    const hasOwnerRole = await rbacService.hasRole(user.user.id, 'owner', tenant.id);
    expect(hasOwnerRole).toBe(true);
  });
});
```

## Related Documentation

- **[PHASE1_VALIDATION.md](PHASE1_VALIDATION.md)**: Phase 1 validation requirements
- **[CORE_TESTING_PATTERNS.md](CORE_TESTING_PATTERNS.md)**: Reusable testing patterns

## Version History

- **1.0.0**: Focused Phase 1 testing extracted from larger document (2025-05-23)
