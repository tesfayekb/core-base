
# Phase 1: Foundation Testing

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

Testing integration for Phase 1 foundation: Database, Authentication, Basic RBAC, Multi-Tenant Foundation with comprehensive code examples.

## Foundation Performance Targets

```typescript
const phase1Targets = {
  database: {
    connectionTime: 100,      // ms
    queryExecution: 50,       // ms for simple queries
    migrationTime: 30000      // ms per migration
  },
  authentication: {
    loginTime: 1000,          // ms
    tokenValidation: 10,      // ms
    sessionLookup: 20         // ms
  },
  basicRBAC: {
    permissionCheck: 15,      // ms (uncached)
    roleAssignment: 100,      // ms
    userRoleQuery: 30         // ms
  },
  multiTenant: {
    tenantIsolation: 0,       // Zero data leakage
    tenantSwitching: 200,     // ms
    queryFiltering: 5         // ms overhead
  }
};
```

## Database Foundation Testing

### Database Schema Testing
```typescript
describe('Database Foundation', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  test('should create all required tables', async () => {
    const tables = await testDb.getTables();
    const requiredTables = ['users', 'tenants', 'roles', 'user_roles', 'audit_logs'];
    
    requiredTables.forEach(tableName => {
      expect(tables).toContain(tableName);
    });
  });

  test('should enforce Row Level Security on all tables', async () => {
    const rlsStatus = await testDb.checkRLSStatus();
    
    expect(rlsStatus.users).toBe(true);
    expect(rlsStatus.tenants).toBe(true);
    expect(rlsStatus.roles).toBe(true);
    expect(rlsStatus.user_roles).toBe(true);
    expect(rlsStatus.audit_logs).toBe(true);
  });

  test('should meet query performance targets', async () => {
    const startTime = performance.now();
    
    await testDb.query('SELECT id FROM users LIMIT 10');
    
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(phase1Targets.database.queryExecution);
  });

  test('should maintain referential integrity', async () => {
    const tenant = await testDb.tenants.create({ name: 'Test Tenant' });
    const user = await testDb.users.create({
      email: 'test@example.com',
      tenantId: tenant.id
    });

    // Should not be able to delete tenant with associated users
    await expect(
      testDb.tenants.delete(tenant.id)
    ).rejects.toThrow('foreign key constraint');
  });
});
```

### Database Connection Testing
```typescript
describe('Database Connection Management', () => {
  test('should establish connection within time limit', async () => {
    const startTime = performance.now();
    
    const connection = await createDatabaseConnection();
    
    const connectionTime = performance.now() - startTime;
    expect(connectionTime).toBeLessThan(phase1Targets.database.connectionTime);
    
    await connection.close();
  });

  test('should handle connection pool efficiently', async () => {
    const connectionPromises = Array.from({ length: 10 }, () => 
      createDatabaseConnection()
    );

    const connections = await Promise.all(connectionPromises);
    
    expect(connections).toHaveLength(10);
    expect(connections.every(conn => conn.isConnected)).toBe(true);

    // Cleanup
    await Promise.all(connections.map(conn => conn.close()));
  });
});
```

## Authentication System Testing

### User Registration Testing
```typescript
describe('User Registration', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(testDb);
  });

  test('should register user within performance target', async () => {
    const startTime = performance.now();
    
    const result = await authService.register({
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe'
    });

    const registrationTime = performance.now() - startTime;
    expect(registrationTime).toBeLessThan(phase1Targets.authentication.loginTime);
    expect(result.user.email).toBe('newuser@example.com');
    expect(result.user.emailVerified).toBe(false);
  });

  test('should validate password requirements', async () => {
    const weakPasswords = [
      'weak',           // Too short
      'password',       // No uppercase/numbers
      'PASSWORD',       // No lowercase/numbers
      '12345678',       // No letters
      'Password1'       // No special characters
    ];

    for (const password of weakPasswords) {
      await expect(
        authService.register({
          email: 'test@example.com',
          password
        })
      ).rejects.toThrow('Password does not meet requirements');
    }
  });

  test('should prevent duplicate email registration', async () => {
    const userData = {
      email: 'duplicate@example.com',
      password: 'SecurePassword123!'
    };

    await authService.register(userData);
    
    await expect(
      authService.register(userData)
    ).rejects.toThrow('Email already registered');
  });
});
```

### Login and Session Testing
```typescript
describe('Login and Session Management', () => {
  test('should login within performance target', async () => {
    // Setup: Create verified user
    const user = await testDb.users.create({
      email: 'login@example.com',
      password: await hashPassword('ValidPassword123!'),
      emailVerified: true
    });

    const startTime = performance.now();
    
    const result = await authService.login({
      email: 'login@example.com',
      password: 'ValidPassword123!'
    });

    const loginTime = performance.now() - startTime;
    expect(loginTime).toBeLessThan(phase1Targets.authentication.loginTime);
    expect(result.success).toBe(true);
    expect(result.user.id).toBe(user.id);
  });

  test('should validate tokens within performance target', async () => {
    const user = await createTestUser();
    const session = await authService.createSession(user.id);

    const startTime = performance.now();
    
    const validation = await authService.validateToken(session.token);
    
    const validationTime = performance.now() - startTime;
    expect(validationTime).toBeLessThan(phase1Targets.authentication.tokenValidation);
    expect(validation.valid).toBe(true);
  });

  test('should handle concurrent login attempts', async () => {
    const user = await createTestUser({ emailVerified: true });
    
    const loginPromises = Array.from({ length: 5 }, () =>
      authService.login({
        email: user.email,
        password: 'TestPassword123!'
      })
    );

    const results = await Promise.allSettled(loginPromises);
    const successfulLogins = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successfulLogins).toBe(5);
  });
});
```

## Basic RBAC Testing

### Permission System Testing
```typescript
describe('Basic RBAC System', () => {
  let rbacService: RBACService;
  let testUser: User;
  let testTenant: Tenant;

  beforeEach(async () => {
    rbacService = new RBACService(testDb);
    testUser = await createTestUser();
    testTenant = await createTestTenant();
  });

  test('should assign and check roles within performance target', async () => {
    const startTime = performance.now();
    
    await rbacService.assignRole(testUser.id, 'basic-user', testTenant.id);
    
    const assignmentTime = performance.now() - startTime;
    expect(assignmentTime).toBeLessThan(phase1Targets.basicRBAC.roleAssignment);

    const checkStart = performance.now();
    
    const hasRole = await rbacService.hasRole(testUser.id, 'basic-user', testTenant.id);
    
    const checkTime = performance.now() - checkStart;
    expect(checkTime).toBeLessThan(phase1Targets.basicRBAC.userRoleQuery);
    expect(hasRole).toBe(true);
  });

  test('should check permissions within performance target', async () => {
    await rbacService.assignRole(testUser.id, 'basic-user', testTenant.id);

    const startTime = performance.now();
    
    const canView = await rbacService.checkPermission({
      userId: testUser.id,
      tenantId: testTenant.id,
      resource: 'documents',
      action: 'view'
    });
    
    const checkTime = performance.now() - startTime;
    expect(checkTime).toBeLessThan(phase1Targets.basicRBAC.permissionCheck);
    expect(canView).toBe(true);
  });

  test('should handle SuperAdmin permissions correctly', async () => {
    await rbacService.assignRole(testUser.id, 'super-admin');

    // SuperAdmin should have all permissions across all tenants
    const permissions = [
      { resource: 'users', action: 'manage' },
      { resource: 'tenants', action: 'manage' },
      { resource: 'documents', action: 'delete' }
    ];

    for (const permission of permissions) {
      const hasPermission = await rbacService.checkPermission({
        userId: testUser.id,
        tenantId: testTenant.id,
        resource: permission.resource,
        action: permission.action
      });
      
      expect(hasPermission).toBe(true);
    }
  });

  test('should enforce BasicUser restrictions', async () => {
    await rbacService.assignRole(testUser.id, 'basic-user', testTenant.id);

    const restrictedActions = [
      { resource: 'users', action: 'manage' },
      { resource: 'documents', action: 'delete' }
    ];

    for (const action of restrictedActions) {
      const hasPermission = await rbacService.checkPermission({
        userId: testUser.id,
        tenantId: testTenant.id,
        resource: action.resource,
        action: action.action
      });
      
      expect(hasPermission).toBe(false);
    }
  });
});
```

## Multi-Tenant Foundation Testing

### Tenant Isolation Testing
```typescript
describe('Multi-Tenant Foundation', () => {
  let tenant1: Tenant;
  let tenant2: Tenant;
  let user1: User;
  let user2: User;

  beforeEach(async () => {
    tenant1 = await createTestTenant({ name: 'Tenant 1' });
    tenant2 = await createTestTenant({ name: 'Tenant 2' });
    
    user1 = await createTestUser({ tenantId: tenant1.id });
    user2 = await createTestUser({ tenantId: tenant2.id });
  });

  test('should enforce complete tenant isolation', async () => {
    // Create documents in each tenant
    const doc1 = await testDb.documents.create({
      title: 'Tenant 1 Document',
      tenantId: tenant1.id,
      createdBy: user1.id
    });

    const doc2 = await testDb.documents.create({
      title: 'Tenant 2 Document',
      tenantId: tenant2.id,
      createdBy: user2.id
    });

    // User 1 should only see their tenant's documents
    const user1Docs = await testDb.documents.findByTenant(tenant1.id);
    expect(user1Docs).toHaveLength(1);
    expect(user1Docs[0].id).toBe(doc1.id);

    // User 2 should only see their tenant's documents
    const user2Docs = await testDb.documents.findByTenant(tenant2.id);
    expect(user2Docs).toHaveLength(1);
    expect(user2Docs[0].id).toBe(doc2.id);

    // Cross-tenant access should be impossible
    const crossTenantAttempt = await testDb.documents.findByTenantAndUser(
      tenant2.id, 
      user1.id
    );
    expect(crossTenantAttempt).toHaveLength(0);
  });

  test('should meet tenant switching performance target', async () => {
    const multiTenantUser = await createTestUser();
    await testDb.userTenants.create({ userId: multiTenantUser.id, tenantId: tenant1.id });
    await testDb.userTenants.create({ userId: multiTenantUser.id, tenantId: tenant2.id });

    const startTime = performance.now();
    
    await authService.switchTenant(multiTenantUser.id, tenant2.id);
    
    const switchTime = performance.now() - startTime;
    expect(switchTime).toBeLessThan(phase1Targets.multiTenant.tenantSwitching);
  });

  test('should add minimal overhead for tenant filtering', async () => {
    // Measure query without tenant filtering
    const startTime1 = performance.now();
    await testDb.query('SELECT * FROM documents LIMIT 10');
    const baseTime = performance.now() - startTime1;

    // Measure query with tenant filtering
    const startTime2 = performance.now();
    await testDb.query('SELECT * FROM documents WHERE tenant_id = $1 LIMIT 10', [tenant1.id]);
    const filteredTime = performance.now() - startTime2;

    const overhead = filteredTime - baseTime;
    expect(overhead).toBeLessThan(phase1Targets.multiTenant.queryFiltering);
  });
});
```

## Phase 1 Integration Testing

### End-to-End Foundation Flow
```typescript
describe('Phase 1 Foundation Integration', () => {
  test('should complete full user onboarding flow', async () => {
    // 1. Register user
    const registrationResult = await authService.register({
      email: 'integration@example.com',
      password: 'SecurePassword123!',
      firstName: 'Integration',
      lastName: 'Test'
    });

    expect(registrationResult.user).toBeDefined();
    expect(registrationResult.verificationToken).toBeDefined();

    // 2. Verify email
    await authService.verifyEmail(registrationResult.verificationToken);
    
    // 3. Login
    const loginResult = await authService.login({
      email: 'integration@example.com',
      password: 'SecurePassword123!'
    });

    expect(loginResult.success).toBe(true);

    // 4. Create tenant
    const tenant = await tenantService.create({
      name: 'Integration Test Org',
      ownerId: registrationResult.user.id
    });

    // 5. Verify role assignment
    const hasOwnerRole = await rbacService.hasRole(
      registrationResult.user.id,
      'owner',
      tenant.id
    );
    expect(hasOwnerRole).toBe(true);

    // 6. Test permissions
    const canManage = await rbacService.checkPermission({
      userId: registrationResult.user.id,
      tenantId: tenant.id,
      resource: 'users',
      action: 'manage'
    });
    expect(canManage).toBe(true);
  });

  test('should maintain performance under concurrent load', async () => {
    const concurrentUsers = 10;
    const operations = Array.from({ length: concurrentUsers }, (_, i) => 
      performCompleteUserFlow(`user${i}@example.com`)
    );

    const startTime = performance.now();
    const results = await Promise.allSettled(operations);
    const totalTime = performance.now() - startTime;

    const successfulOperations = results.filter(r => r.status === 'fulfilled').length;
    expect(successfulOperations).toBe(concurrentUsers);
    expect(totalTime / concurrentUsers).toBeLessThan(2000); // Average 2s per user
  });
});

async function performCompleteUserFlow(email: string) {
  const user = await authService.register({
    email,
    password: 'TestPassword123!'
  });
  
  await authService.verifyEmail(user.verificationToken);
  
  const session = await authService.login({
    email,
    password: 'TestPassword123!'
  });
  
  const tenant = await tenantService.create({
    name: `${email} Organization`,
    ownerId: user.user.id
  });
  
  return { user, session, tenant };
}
```

## Performance Validation Summary

```typescript
describe('Phase 1 Performance Validation', () => {
  test('should meet all performance targets', async () => {
    const validationResults = await validatePhase1Performance();
    
    expect(validationResults.database.connectionTime).toBeLessThan(phase1Targets.database.connectionTime);
    expect(validationResults.database.queryExecution).toBeLessThan(phase1Targets.database.queryExecution);
    expect(validationResults.authentication.loginTime).toBeLessThan(phase1Targets.authentication.loginTime);
    expect(validationResults.authentication.tokenValidation).toBeLessThan(phase1Targets.authentication.tokenValidation);
    expect(validationResults.rbac.permissionCheck).toBeLessThan(phase1Targets.basicRBAC.permissionCheck);
    expect(validationResults.multiTenant.tenantSwitching).toBeLessThan(phase1Targets.multiTenant.tenantSwitching);
    expect(validationResults.multiTenant.queryFiltering).toBeLessThan(phase1Targets.multiTenant.queryFiltering);
  });
});
```

## Related Documentation

- **[OVERVIEW.md](OVERVIEW.md)**: Testing integration overview
- **[TESTING_PATTERNS.md](TESTING_PATTERNS.md)**: Detailed testing patterns and examples
- **[PHASE2_TESTING.md](PHASE2_TESTING.md)**: Phase 2 testing requirements

## Version History

- **2.0.0**: Enhanced with comprehensive code examples and performance testing (2025-05-23)
- **1.0.0**: Extracted Phase 1 testing from TESTING_INTEGRATION_GUIDE.md (2025-05-23)
