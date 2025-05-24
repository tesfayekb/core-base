
# Integration Test Implementation Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides a practical implementation guide for creating integration tests that validate interactions between major system components. It builds upon the testing architecture defined in [TEST_FRAMEWORK.md](docs/TEST_FRAMEWORK.md) and focuses on practical implementation.

## Implementation Approach

### 1. Test Structure and Organization

Organize integration tests by primary interaction points:

```
tests/
├── integration/
│   ├── auth-rbac/           # Auth and RBAC integration
│   │   ├── login.test.ts
│   │   └── session.test.ts
│   ├── rbac-tenant/         # RBAC and Multi-tenant integration
│   │   ├── isolation.test.ts
│   │   └── hierarchy.test.ts
│   ├── tenant-audit/        # Multi-tenant and Audit integration
│   │   └── tenant-events.test.ts
│   └── full-flows/          # End-to-end integration flows
│       ├── onboarding.test.ts
│       └── permission-changes.test.ts
```

### 2. Integration Test Environment Setup

Implement a standardized environment setup for all integration tests:

```typescript
// tests/integration/setup.ts
import { setupIntegrationDb } from '../utils/db-setup';
import { seedTestData } from '../utils/seed-data';

beforeAll(async () => {
  // Set up isolated test database
  global.testDb = await setupIntegrationDb();
  
  // Set up test services
  global.services = {
    auth: new AuthService(global.testDb),
    rbac: new RbacService(global.testDb),
    tenant: new TenantService(global.testDb),
    audit: new AuditService(global.testDb),
    user: new UserService(global.testDb)
  };
  
  // Seed standard test data
  await seedTestData(global.testDb);
});

afterAll(async () => {
  // Clean up test database
  await global.testDb.close();
});

beforeEach(async () => {
  // Reset mocks before each test
  jest.clearAllMocks();
  
  // Start transaction for test isolation
  await global.testDb.startTransaction();
});

afterEach(async () => {
  // Rollback transaction after each test
  await global.testDb.rollbackTransaction();
});
```

### 3. Integration Test Helper Functions

Create helper functions for common integration testing needs:

```typescript
// tests/integration/helpers.ts
export async function createTestUserWithRole(role: string, tenantId?: string) {
  const userId = `user-${Date.now()}`;
  const email = `${userId}@example.com`;
  
  // Create user
  await global.services.user.createUser({
    id: userId,
    email,
    password: 'test-password'
  });
  
  // Assign role
  await global.services.rbac.assignRole(userId, role);
  
  // Assign to tenant if provided
  if (tenantId) {
    await global.services.tenant.addUserToTenant(userId, tenantId);
  }
  
  return { userId, email };
}

export async function verifyPermission(userId: string, resource: string, action: string, tenantId?: string) {
  return global.services.rbac.checkPermission({
    userId,
    resourceType: resource,
    action,
    tenantId
  });
}

export async function getAuditEventsForUser(userId: string, eventType?: string) {
  const query = { userId };
  if (eventType) {
    query.eventType = eventType;
  }
  return global.services.audit.findEvents(query);
}
```

## Practical Implementation Examples

### 1. Authentication and RBAC Integration

```typescript
// tests/integration/auth-rbac/login.test.ts
import { createTestUserWithRole, verifyPermission } from '../helpers';

describe('Authentication and RBAC Integration', () => {
  test('login should establish permission context', async () => {
    // 1. Create test user with role
    const { email } = await createTestUserWithRole('editor');
    
    // 2. Perform login
    const { user, session } = await global.services.auth.login({
      email,
      password: 'test-password'
    });
    
    // 3. Verify permissions from session context
    const canViewDocs = await verifyPermission(user.id, 'documents', 'view');
    const canEditDocs = await verifyPermission(user.id, 'documents', 'edit');
    const canDeleteDocs = await verifyPermission(user.id, 'documents', 'delete');
    
    // 4. Assert expected permissions
    expect(canViewDocs).toBe(true);
    expect(canEditDocs).toBe(true);
    expect(canDeleteDocs).toBe(false);
  });
  
  test('permission changes should invalidate session cache', async () => {
    // 1. Create test user with basic role
    const { userId, email } = await createTestUserWithRole('viewer');
    
    // 2. Login to establish session
    const { session } = await global.services.auth.login({
      email,
      password: 'test-password'
    });
    
    // 3. Initial permission check (and cache)
    const initialCanEdit = await verifyPermission(userId, 'documents', 'edit');
    expect(initialCanEdit).toBe(false);
    
    // 4. Upgrade user role
    await global.services.rbac.assignRole(userId, 'editor');
    
    // 5. Verify permission cache is invalidated
    const updatedCanEdit = await verifyPermission(userId, 'documents', 'edit');
    expect(updatedCanEdit).toBe(true);
  });
});
```

### 2. RBAC and Multi-tenant Integration

```typescript
// tests/integration/rbac-tenant/isolation.test.ts
import { createTestUserWithRole } from '../helpers';

describe('RBAC and Multi-tenant Integration', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  
  beforeEach(async () => {
    // Create test tenants
    tenant1Id = (await global.services.tenant.createTenant('Test Tenant 1')).id;
    tenant2Id = (await global.services.tenant.createTenant('Test Tenant 2')).id;
  });
  
  test('permissions should be tenant-specific', async () => {
    // 1. Create test user with tenant-specific roles
    const { userId } = await createTestUserWithRole('viewer');
    
    // 2. Add user to both tenants
    await global.services.tenant.addUserToTenant(userId, tenant1Id);
    await global.services.tenant.addUserToTenant(userId, tenant2Id);
    
    // 3. Grant different permissions in different tenants
    await global.services.rbac.assignRoleInTenant(userId, 'viewer', tenant1Id);
    await global.services.rbac.assignRoleInTenant(userId, 'editor', tenant2Id);
    
    // 4. Check permissions in each tenant
    const canEditInTenant1 = await global.services.rbac.checkPermission({
      userId,
      tenantId: tenant1Id,
      resourceType: 'documents',
      action: 'edit'
    });
    
    const canEditInTenant2 = await global.services.rbac.checkPermission({
      userId,
      tenantId: tenant2Id,
      resourceType: 'documents',
      action: 'edit'
    });
    
    // 5. Assert tenant-specific permissions
    expect(canEditInTenant1).toBe(false); // viewer role
    expect(canEditInTenant2).toBe(true);  // editor role
  });
  
  test('tenant isolation should prevent cross-tenant data access', async () => {
    // 1. Create test user with access to tenant 1 only
    const { userId } = await createTestUserWithRole('editor');
    await global.services.tenant.addUserToTenant(userId, tenant1Id);
    
    // 2. Create documents in both tenants
    const doc1Id = (await global.services.documents.createDocument({
      tenantId: tenant1Id,
      title: 'Tenant 1 Document',
      content: 'Test content'
    })).id;
    
    const doc2Id = (await global.services.documents.createDocument({
      tenantId: tenant2Id,
      title: 'Tenant 2 Document',
      content: 'Test content'
    })).id;
    
    // 3. Attempt to access documents from both tenants
    const canAccessDoc1 = await global.services.rbac.checkPermission({
      userId,
      tenantId: tenant1Id,
      resourceType: 'documents',
      action: 'view',
      resourceId: doc1Id
    });
    
    const canAccessDoc2 = await global.services.rbac.checkPermission({
      userId,
      tenantId: tenant2Id,
      resourceType: 'documents',
      action: 'view',
      resourceId: doc2Id
    });
    
    // 4. Assert tenant isolation
    expect(canAccessDoc1).toBe(true);   // Has access to tenant 1
    expect(canAccessDoc2).toBe(false);  // No access to tenant 2
  });
});
```

### 3. Full End-to-End Integration Flow

```typescript
// tests/integration/full-flows/onboarding.test.ts
describe('User Onboarding Integration Flow', () => {
  test('complete user onboarding process', async () => {
    // 1. Register new user
    const email = `test-${Date.now()}@example.com`;
    const password = 'Test@123456';
    
    const { user, verificationToken } = await global.services.auth.register({
      email,
      password
    });
    
    // 2. Verify audit log of registration
    const registrationEvents = await global.services.audit.findEvents({
      eventType: 'user.registered',
      userId: user.id
    });
    expect(registrationEvents.length).toBe(1);
    
    // 3. Verify email and activate account
    await global.services.auth.verifyEmail(verificationToken);
    
    // 4. Login with verified account
    const { session } = await global.services.auth.login({ email, password });
    expect(session).toBeDefined();
    
    // 5. Create new organization (tenant)
    const orgName = 'Test Organization';
    const { id: orgId } = await global.services.tenant.createTenant(orgName, {
      ownerId: user.id
    });
    
    // 6. Verify tenant creation in audit log
    const tenantEvents = await global.services.audit.findEvents({
      eventType: 'tenant.created',
      userId: user.id
    });
    expect(tenantEvents.length).toBe(1);
    expect(tenantEvents[0].metadata.tenantId).toBe(orgId);
    
    // 7. Verify default role assignment
    const hasOwnerRole = await global.services.rbac.checkUserHasRole(user.id, 'owner', orgId);
    expect(hasOwnerRole).toBe(true);
    
    // 8. Verify initial owner permissions
    const canManageUsers = await global.services.rbac.checkPermission({
      userId: user.id,
      tenantId: orgId,
      resourceType: 'users',
      action: 'manage'
    });
    expect(canManageUsers).toBe(true);
    
    // 9. Create a project in the organization
    const { id: projectId } = await global.services.projects.createProject({
      tenantId: orgId,
      name: 'Test Project',
      createdBy: user.id
    });
    
    // 10. Verify project creation and permissions
    const canViewProject = await global.services.rbac.checkPermission({
      userId: user.id,
      tenantId: orgId,
      resourceType: 'projects',
      action: 'view',
      resourceId: projectId
    });
    expect(canViewProject).toBe(true);
    
    // 11. End-to-end flow complete - verify final state
    const userTenants = await global.services.tenant.getUserTenants(user.id);
    expect(userTenants.length).toBe(1);
    expect(userTenants[0].id).toBe(orgId);
  });
});
```

## Integration Test Coverage Matrix

| Component Integration | Critical Test Cases | Implementation Priority |
|------------------------|---------------------|------------------------|
| Auth + RBAC | Session permission context | High |
| Auth + Tenant | User tenant assignment | High |
| RBAC + Tenant | Tenant-specific permissions | High |
| UI + Auth | Login flow & session management | Medium |
| UI + RBAC | Permission-based component visibility | Medium |
| API + Auth | API authentication & session validation | High |
| API + RBAC | Endpoint permission enforcement | High |
| API + Tenant | Tenant context in API calls | Medium |
| RBAC + Audit | Permission change audit trails | Medium |
| Tenant + Audit | Tenant operation audit trails | Medium |
| Events + All | Cross-component event propagation | Low |

## Related Documentation

- **[Integration Testing Overview](docs/testing/INTEGRATION_TESTING.md)**: Overall integration testing strategy
- **[Component Integration Map](docs/testing/COMPONENT_INTEGRATION_MAP.md)**: Component integration mapping
- **[TEST_FRAMEWORK.md](docs/TEST_FRAMEWORK.md)**: Overall testing framework
- **[RBAC Testing Strategy](docs/rbac/TESTING_STRATEGY.md)**: RBAC-specific testing

## Version History

- **1.0.0**: Initial integration test implementation strategy (2025-05-23)
