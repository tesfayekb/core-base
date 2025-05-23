
# Testing Patterns and Code Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides specific testing patterns and complete code examples for implementing tests across different system components.

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

  test('should enforce unique email constraint', async () => {
    const userData = {
      email: 'duplicate@example.com',
      password: 'hashedPassword',
      tenantId: 'test-tenant-id'
    };

    await testDb.users.create(userData);
    
    await expect(
      testDb.users.create(userData)
    ).rejects.toThrow('Email already exists');
  });
});
```

### Multi-tenant Database Testing
```typescript
describe('Multi-tenant Data Isolation', () => {
  test('should isolate tenant data in queries', async () => {
    // Create data for different tenants
    const tenant1User = await testDb.users.create({
      email: 'user1@tenant1.com',
      tenantId: 'tenant-1'
    });
    
    const tenant2User = await testDb.users.create({
      email: 'user2@tenant2.com',
      tenantId: 'tenant-2'
    });

    // Query with tenant filter
    const tenant1Users = await testDb.users.findByTenant('tenant-1');
    const tenant2Users = await testDb.users.findByTenant('tenant-2');

    expect(tenant1Users).toHaveLength(1);
    expect(tenant1Users[0].id).toBe(tenant1User.id);
    
    expect(tenant2Users).toHaveLength(1);
    expect(tenant2Users[0].id).toBe(tenant2User.id);
  });
});
```

## Authentication Testing Patterns

### Login Flow Testing
```typescript
describe('Authentication Flow', () => {
  let authService: AuthService;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordReset: jest.fn().mockResolvedValue(true)
    } as jest.Mocked<EmailService>;
    
    authService = new AuthService(testDb, mockEmailService);
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
    expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
      registrationData.email,
      result.verificationToken
    );
  });

  test('should login with valid credentials', async () => {
    // Setup: Create verified user
    const user = await testDb.users.create({
      email: 'login@example.com',
      password: await hashPassword('ValidPassword123!'),
      emailVerified: true
    });

    const loginResult = await authService.login({
      email: 'login@example.com',
      password: 'ValidPassword123!'
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user.id).toBe(user.id);
    expect(loginResult.token).toBeDefined();
    expect(loginResult.refreshToken).toBeDefined();
  });

  test('should reject login with invalid credentials', async () => {
    await expect(
      authService.login({
        email: 'nonexistent@example.com',
        password: 'WrongPassword'
      })
    ).rejects.toThrow('Invalid credentials');
  });
});
```

### Session Management Testing
```typescript
describe('Session Management', () => {
  test('should validate active session', async () => {
    const user = await createTestUser();
    const session = await authService.createSession(user.id);

    const validation = await authService.validateSession(session.token);

    expect(validation.valid).toBe(true);
    expect(validation.user.id).toBe(user.id);
  });

  test('should invalidate expired session', async () => {
    const user = await createTestUser();
    const session = await authService.createSession(user.id, { 
      expiresIn: -1000 // Expired 1 second ago
    });

    const validation = await authService.validateSession(session.token);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe('expired');
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
    // Assign role to user
    await rbacService.assignRole(testUser.id, 'editor', testTenant.id);

    // Test permission checks
    const canView = await rbacService.checkPermission({
      userId: testUser.id,
      tenantId: testTenant.id,
      resource: 'documents',
      action: 'view'
    });

    const canEdit = await rbacService.checkPermission({
      userId: testUser.id,
      tenantId: testTenant.id,
      resource: 'documents',
      action: 'edit'
    });

    const canDelete = await rbacService.checkPermission({
      userId: testUser.id,
      tenantId: testTenant.id,
      resource: 'documents',
      action: 'delete'
    });

    expect(canView).toBe(true);
    expect(canEdit).toBe(true);
    expect(canDelete).toBe(false); // Editor cannot delete
  });

  test('should deny cross-tenant permissions', async () => {
    const otherTenant = await createTestTenant();
    await rbacService.assignRole(testUser.id, 'admin', testTenant.id);

    const canAccessOtherTenant = await rbacService.checkPermission({
      userId: testUser.id,
      tenantId: otherTenant.id, // Different tenant
      resource: 'documents',
      action: 'view'
    });

    expect(canAccessOtherTenant).toBe(false);
  });
});
```

### Role Hierarchy Testing
```typescript
describe('Role Hierarchy', () => {
  test('should inherit permissions from parent roles', async () => {
    // Setup role hierarchy: Admin > Editor > Viewer
    await rbacService.createRole({
      name: 'viewer',
      permissions: ['documents.view']
    });

    await rbacService.createRole({
      name: 'editor',
      permissions: ['documents.edit'],
      inherits: ['viewer']
    });

    await rbacService.createRole({
      name: 'admin',
      permissions: ['documents.delete'],
      inherits: ['editor']
    });

    await rbacService.assignRole(testUser.id, 'admin', testTenant.id);

    // Admin should have all permissions through inheritance
    const canView = await rbacService.checkPermission({
      userId: testUser.id,
      tenantId: testTenant.id,
      resource: 'documents',
      action: 'view'
    });

    const canEdit = await rbacService.checkPermission({
      userId: testUser.id,
      tenantId: testTenant.id,
      resource: 'documents',
      action: 'edit'
    });

    const canDelete = await rbacService.checkPermission({
      userId: testUser.id,
      tenantId: testTenant.id,
      resource: 'documents',
      action: 'delete'
    });

    expect(canView).toBe(true);   // Inherited from viewer
    expect(canEdit).toBe(true);   // Inherited from editor
    expect(canDelete).toBe(true); // Direct permission
  });
});
```

## UI Component Testing Patterns

### Form Component Testing
```typescript
describe('User Registration Form', () => {
  test('should validate required fields', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    
    render(<RegistrationForm onSubmit={mockOnSubmit} />);

    // Try to submit without filling fields
    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    
    render(<RegistrationForm onSubmit={mockOnSubmit} />);

    // Fill in form fields
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123!');

    // Submit form
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'SecurePassword123!'
    });
  });
});
```

### Permission-Based Component Testing
```typescript
describe('Permission-Based UI Components', () => {
  test('should show admin actions for admin users', () => {
    const adminUser = createMockUser({ role: 'admin' });
    
    render(
      <UserProvider user={adminUser}>
        <DocumentActions documentId="123" />
      </UserProvider>
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  test('should hide admin actions for regular users', () => {
    const regularUser = createMockUser({ role: 'viewer' });
    
    render(
      <UserProvider user={regularUser}>
        <DocumentActions documentId="123" />
      </UserProvider>
    );

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
  });
});
```

## Integration Testing Patterns

### API Integration Testing
```typescript
describe('API Integration', () => {
  let apiClient: ApiClient;
  let mockServer: MockServer;

  beforeEach(() => {
    mockServer = createMockServer();
    apiClient = new ApiClient({ baseUrl: mockServer.url });
  });

  afterEach(() => {
    mockServer.close();
  });

  test('should handle successful API responses', async () => {
    mockServer.mock('GET', '/api/users', {
      status: 200,
      body: { users: [{ id: '1', email: 'test@example.com' }] }
    });

    const response = await apiClient.getUsers();

    expect(response.users).toHaveLength(1);
    expect(response.users[0].email).toBe('test@example.com');
  });

  test('should handle API error responses', async () => {
    mockServer.mock('GET', '/api/users', {
      status: 500,
      body: { error: 'Internal Server Error' }
    });

    await expect(apiClient.getUsers()).rejects.toThrow('Internal Server Error');
  });
});
```

## Performance Testing Patterns

### Response Time Testing
```typescript
describe('Performance Requirements', () => {
  test('should meet response time targets for user operations', async () => {
    const startTime = performance.now();
    
    await userService.createUser({
      email: 'perf-test@example.com',
      password: 'password'
    });
    
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(100); // 100ms target
  });

  test('should handle concurrent operations efficiently', async () => {
    const concurrentOperations = Array.from({ length: 50 }, (_, i) => 
      userService.createUser({
        email: `user${i}@example.com`,
        password: 'password'
      })
    );

    const startTime = performance.now();
    const results = await Promise.allSettled(concurrentOperations);
    const duration = performance.now() - startTime;

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBe(50);
    expect(duration).toBeLessThan(2000); // 2 second target for 50 operations
  });
});
```

## Test Utility Functions

### Common Test Helpers
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

  createMockUser: (overrides: Partial<User> = {}) => ({
    id: 'mock-user-id',
    email: 'mock@example.com',
    role: 'viewer',
    ...overrides
  }),

  measureExecutionTime: async (fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }
};
```

## Related Documentation

- **[OVERVIEW.md](OVERVIEW.md)**: Testing integration overview
- **[PHASE1_TESTING.md](PHASE1_TESTING.md)**: Phase 1 testing implementation
- **[PHASE2_TESTING.md](PHASE2_TESTING.md)**: Phase 2 testing implementation
- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Overall testing framework

## Version History

- **1.0.0**: Initial testing patterns with comprehensive code examples (2025-05-23)
