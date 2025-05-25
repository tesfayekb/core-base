
// Tenant Testing Utilities
// Helper functions for comprehensive tenant isolation testing

export const tenantTestHelpers = {
  // Generate unique test tenant IDs
  generateTenantId: (prefix: string = 'test-tenant') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Generate unique test user IDs
  generateUserId: (prefix: string = 'test-user') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create test data for tenant isolation testing
  createTestTenantData: (tenantId: string) => ({
    id: tenantId,
    name: `Test Tenant ${tenantId}`,
    slug: `test-slug-${tenantId}`,
    status: 'active',
    settings: { testMode: true },
    metadata: { createdForTesting: true }
  }),

  // Create test user data
  createTestUserData: (userId: string, tenantId: string) => ({
    id: userId,
    email: `${userId}@test.example.com`,
    firstName: 'Test',
    lastName: 'User',
    tenantId: tenantId,
    status: 'active'
  }),

  // Measure operation performance
  measurePerformance: async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;
    return { result, duration };
  },

  // Validate tenant isolation
  validateTenantIsolation: async (
    operation: () => Promise<any>,
    expectedResult: 'success' | 'failure' | 'empty'
  ): Promise<boolean> => {
    try {
      const result = await operation();
      
      switch (expectedResult) {
        case 'success':
          return result !== null && result !== undefined;
        case 'failure':
          return false; // If we reach here, operation didn't fail as expected
        case 'empty':
          return !result || (Array.isArray(result.rows) && result.rows.length === 0);
        default:
          return false;
      }
    } catch (error) {
      return expectedResult === 'failure';
    }
  },

  // Security test patterns
  securityTestPatterns: {
    sqlInjectionInputs: [
      "'; DROP TABLE tenants; --",
      "' OR '1'='1",
      "'; UPDATE users SET admin = true; --",
      "' UNION SELECT * FROM sensitive_table --",
      "'; SELECT * FROM information_schema.tables; --"
    ],
    
    tenantEnumerationAttempts: [
      'admin',
      'test',
      'production',
      'staging',
      'tenant-1',
      'default',
      'system'
    ],
    
    privilegeEscalationAttempts: [
      'admin',
      'superuser',
      'root',
      'system',
      'service'
    ]
  },

  // Performance targets for tenant operations
  performanceTargets: {
    tenantSwitching: 200, // ms
    permissionCheck: 15,  // ms
    dataQuery: 50,        // ms
    contextValidation: 10 // ms
  }
};

// Test data factory for consistent test scenarios
export class TenantTestDataFactory {
  private tenantCounter = 0;
  private userCounter = 0;

  createTenant() {
    this.tenantCounter++;
    return {
      id: `test-tenant-${this.tenantCounter}-${Date.now()}`,
      name: `Test Tenant ${this.tenantCounter}`,
      slug: `test-tenant-${this.tenantCounter}`,
      status: 'active' as const
    };
  }

  createUser(tenantId: string) {
    this.userCounter++;
    return {
      id: `test-user-${this.userCounter}-${Date.now()}`,
      email: `testuser${this.userCounter}@example.com`,
      tenantId,
      firstName: `Test${this.userCounter}`,
      lastName: 'User'
    };
  }

  createPermission(tenantId: string) {
    return {
      id: `test-permission-${Date.now()}`,
      name: `test_permission_${Date.now()}`,
      action: 'read' as const,
      resource: 'documents',
      tenantId
    };
  }

  reset() {
    this.tenantCounter = 0;
    this.userCounter = 0;
  }
}

export const testDataFactory = new TenantTestDataFactory();
