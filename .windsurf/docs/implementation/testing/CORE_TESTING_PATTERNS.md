
# Core Testing Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Essential testing patterns for AI implementation. This document provides the most commonly used testing patterns with complete code examples.

## Database Testing Patterns

### Basic Database Test Setup
```typescript
// tests/database/setup.ts
import { createTestDatabase, seedTestData } from '../utils/db-test-utils';

export async function setupDatabaseTests() {
  const testDb = await createTestDatabase();
  await seedTestData(testDb);
  return testDb;
}

// Example database test
describe('User Database Operations', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await setupDatabaseTests();
  });

  beforeEach(async () => {
    await testDb.beginTransaction();
  });

  afterEach(async () => {
    await testDb.rollback();
  });

  test('should create user with proper constraints', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'hashedPassword',
      tenantId: 'test-tenant-id'
    };

    const user = await testDb.users.create(userData);
    
    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.tenantId).toBe(userData.tenantId);
    expect(user.createdAt).toBeInstanceOf(Date);
  });
});
```

## Authentication Testing Patterns

### Login Flow Testing
```typescript
describe('Authentication Flow', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(testDb);
  });

  test('should register user and send verification email', async () => {
    const registrationData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe'
    };

    const result = await authService.register(registrationData);

    expect(result.user.email).toBe(registrationData.email);
    expect(result.user.emailVerified).toBe(false);
    expect(result.verificationToken).toBeDefined();
  });
});
```

## RBAC Testing Patterns

### Permission Testing
```typescript
describe('RBAC Permission System', () => {
  let rbacService: RBACService;
  let testUser: User;
  let testTenant: Tenant;

  beforeEach(async () => {
    rbacService = new RBACService(testDb);
    testUser = await createTestUser();
    testTenant = await createTestTenant();
  });

  test('should grant permissions based on role', async () => {
    await rbacService.assignRole(testUser.id, 'editor', testTenant.id);

    const canView = await rbacService.checkPermission({
      userId: testUser.id,
      tenantId: testTenant.id,
      resource: 'documents',
      action: 'view'
    });

    expect(canView).toBe(true);
  });
});
```

## Multi-Tenant Testing Patterns

### Tenant Isolation Testing
```typescript
describe('Multi-Tenant Foundation', () => {
  test('should enforce complete tenant isolation', async () => {
    const tenant1 = await createTestTenant({ name: 'Tenant 1' });
    const tenant2 = await createTestTenant({ name: 'Tenant 2' });
    
    const user1 = await createTestUser({ tenantId: tenant1.id });
    const user2 = await createTestUser({ tenantId: tenant2.id });

    // Create documents in each tenant
    const doc1 = await testDb.documents.create({
      title: 'Tenant 1 Document',
      tenantId: tenant1.id,
      createdBy: user1.id
    });

    // User 1 should only see their tenant's documents
    const user1Docs = await testDb.documents.findByTenant(tenant1.id);
    expect(user1Docs).toHaveLength(1);
    expect(user1Docs[0].id).toBe(doc1.id);
  });
});
```

## Common Test Helpers

```typescript
// tests/utils/test-helpers.ts
export const testHelpers = {
  createTestUser: async (overrides: Partial<User> = {}) => {
    return testDb.users.create({
      email: `test-${Date.now()}@example.com`,
      password: await hashPassword('TestPassword123!'),
      emailVerified: true,
      ...overrides
    });
  },

  createTestTenant: async (overrides: Partial<Tenant> = {}) => {
    return testDb.tenants.create({
      name: `Test Tenant ${Date.now()}`,
      ...overrides
    });
  },

  measureExecutionTime: async (fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }
};
```

## Related Documentation

- **[ADVANCED_TESTING_PATTERNS.md](ADVANCED_TESTING_PATTERNS.md)**: Complex testing scenarios
- **[UI_TESTING_PATTERNS.md](UI_TESTING_PATTERNS.md)**: Component testing patterns
- **[PERFORMANCE_TESTING_PATTERNS.md](PERFORMANCE_TESTING_PATTERNS.md)**: Performance testing patterns

## Version History

- **1.0.0**: Extracted core patterns from TESTING_PATTERNS.md for better AI processing (2025-05-23)
