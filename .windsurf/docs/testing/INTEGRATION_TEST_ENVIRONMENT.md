
# Integration Test Environment Setup

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the setup and configuration of the integration testing environment, including database management, service configuration, and test automation.

## Test Database Setup

### Isolated Test Database Configuration

```typescript
// Example test configuration
export const integrationTestConfig = {
  database: {
    url: process.env.TEST_DATABASE_URL,
    schema: 'integration_tests'
  },
  services: {
    auth: {
      jwtSecret: 'test-secret',
      tokenExpiry: '1h'
    },
    permissions: {
      cacheTTL: 60 // 1 minute for faster testing
    }
  },
  mocks: {
    email: true, // Mock email service
    externalAPIs: true // Mock external API calls
  }
};
```

### Database Setup Functions

```typescript
// Example: Setup database for integration tests
export async function setupIntegrationTestDatabase() {
  // Create test schema
  await db.query('CREATE SCHEMA IF NOT EXISTS integration_test');
  
  // Run migrations on test schema
  await db.migrate({ schema: 'integration_test' });
  
  // Seed with standard test data
  await seedIntegrationTestData();
  
  // Return test database connection
  return db.withSchema('integration_test');
}

export async function cleanupIntegrationTestDatabase() {
  // Drop test schema to clean up
  await db.query('DROP SCHEMA IF EXISTS integration_test CASCADE');
}
```

## Integration Test Framework Setup

### Standardized Environment Setup

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

## Test Fixtures and Factories

### Integration Test Fixtures

```typescript
// Example: Standard integration test fixtures
export const integrationFixtures = {
  users: {
    admin: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@example.com',
      roles: ['super-admin']
    },
    regular: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'user@example.com',
      roles: ['basic-user']
    }
  },
  tenants: {
    primary: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Primary Tenant'
    },
    secondary: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Secondary Tenant'
    }
  },
  permissions: {
    view: 'documents.view',
    create: 'documents.create',
    manage: 'users.manage'
  }
};
```

### Test Helper Functions

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

## Service Mocking Strategy

### Component Mocking Approach

```typescript
// Example: Testing RBAC with mocked Auth but real Audit
describe('RBAC-Audit Integration', () => {
  // Mock auth service
  jest.mock('../services/authService', () => ({
    verifySession: jest.fn().mockResolvedValue({
      userId: 'test-user',
      tenantId: 'test-tenant'
    })
  }));
  
  // Use real RBAC and Audit services
  const rbacService = new RBACService();
  const auditService = new AuditService();
  
  test('permission changes should be audited', async () => {
    // Test implementation
  });
});
```

### External Service Mocking

```typescript
// Mock external services for integration tests
export const mockExternalServices = {
  email: {
    send: jest.fn().mockResolvedValue({ success: true }),
    verify: jest.fn().mockResolvedValue({ valid: true })
  },
  
  analytics: {
    track: jest.fn().mockResolvedValue({ recorded: true }),
    identify: jest.fn().mockResolvedValue({ success: true })
  },
  
  storage: {
    upload: jest.fn().mockResolvedValue({ url: 'mock://file-url' }),
    delete: jest.fn().mockResolvedValue({ deleted: true })
  }
};
```

## Test Environment Configuration

### Environment Variables for Testing

```bash
# Test environment configuration
NODE_ENV=test
TEST_DATABASE_URL=postgresql://localhost:5432/test_db
TEST_REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret-key
ENCRYPT_KEY=test-encryption-key

# Mock service endpoints
MOCK_EMAIL_SERVICE=true
MOCK_ANALYTICS_SERVICE=true
MOCK_STORAGE_SERVICE=true

# Test-specific timeouts
TEST_TIMEOUT=30000
INTEGRATION_TEST_TIMEOUT=60000
```

### CI/CD Integration

```yaml
# Example CI configuration for integration tests
integration_tests:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:14
      env:
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: test_db
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
    
    redis:
      image: redis:6
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  
  steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run database migrations
      run: npm run db:migrate:test
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        TEST_REDIS_URL: redis://localhost:6379/1
```

## Test Data Management

### Database Transaction Management

```typescript
// Transaction-based test isolation
export class TestTransaction {
  private transaction: any;
  
  async start() {
    this.transaction = await global.testDb.startTransaction();
  }
  
  async rollback() {
    if (this.transaction) {
      await this.transaction.rollback();
    }
  }
  
  async commit() {
    if (this.transaction) {
      await this.transaction.commit();
    }
  }
}

// Usage in tests
beforeEach(async () => {
  global.testTransaction = new TestTransaction();
  await global.testTransaction.start();
});

afterEach(async () => {
  await global.testTransaction.rollback();
});
```

### Test Data Seeding

```typescript
// Standardized test data seeding
export async function seedIntegrationTestData() {
  // Create standard roles
  await global.services.rbac.createRole({
    name: 'admin',
    permissions: ['users.manage', 'documents.create', 'documents.view']
  });
  
  await global.services.rbac.createRole({
    name: 'user',
    permissions: ['documents.view']
  });
  
  // Create test tenants
  await global.services.tenant.createTenant({
    id: integrationFixtures.tenants.primary.id,
    name: integrationFixtures.tenants.primary.name
  });
  
  // Create test users
  await global.services.user.createUser({
    id: integrationFixtures.users.admin.id,
    email: integrationFixtures.users.admin.email,
    password: 'test-password'
  });
}
```

## Test Automation and Reporting

### Automated Test Execution

```typescript
// Test suite configuration
export const testSuiteConfig = {
  parallel: true,
  maxWorkers: 4,
  timeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  testMatch: ['**/tests/integration/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Result Reporting

```typescript
// Custom test reporter for integration tests
export class IntegrationTestReporter {
  onTestResult(test: any, testResult: any) {
    if (testResult.numFailingTests > 0) {
      console.log(`❌ Integration test failures in ${test.path}`);
      testResult.testResults.forEach((result: any) => {
        if (result.status === 'failed') {
          console.log(`  - ${result.title}: ${result.failureMessages[0]}`);
        }
      });
    }
  }
  
  onRunComplete(contexts: any, results: any) {
    console.log(`Integration Tests Summary:`);
    console.log(`  Total: ${results.numTotalTests}`);
    console.log(`  Passed: ${results.numPassedTests}`);
    console.log(`  Failed: ${results.numFailedTests}`);
    console.log(`  Duration: ${results.testRunTime}ms`);
  }
}
```

## Related Documentation

- **[CORE_COMPONENT_INTEGRATION.md](docs/testing/CORE_COMPONENT_INTEGRATION.md)**: Core integration testing patterns
- **[ADVANCED_INTEGRATION_PATTERNS.md](docs/testing/ADVANCED_INTEGRATION_PATTERNS.md)**: Advanced testing scenarios
- **[TEST_FRAMEWORK.md](docs/TEST_FRAMEWORK.md)**: Overall testing framework
- **[PERFORMANCE_STANDARDS.md](docs/PERFORMANCE_STANDARDS.md)**: Performance benchmarks

## Version History

- **1.0.0**: Extracted integration test environment setup from INTEGRATION_TESTING.md (2025-05-23)
