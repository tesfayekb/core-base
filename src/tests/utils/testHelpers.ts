
// Test Helper Utilities
// Following src/docs/implementation/testing/CORE_TESTING_PATTERNS.md

// Re-export testing library functions that other tests depend on
export { render, fireEvent, waitFor } from '@testing-library/react';
export { screen } from '@testing-library/react';
export { expect } from 'vitest';

export const testHelpers = {
  createTestUser: (overrides: any = {}) => ({
    id: `test-user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    email_verified: true,
    created_at: new Date().toISOString(),
    ...overrides
  }),

  createTestTenant: (overrides: any = {}) => ({
    id: `test-tenant-${Date.now()}`,
    name: `Test Tenant ${Date.now()}`,
    created_at: new Date().toISOString(),
    ...overrides
  }),

  measureExecutionTime: async (fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  waitForAuth: (timeout = 5000) => {
    return new Promise((resolve) => {
      setTimeout(resolve, 100); // Simulate auth delay
    });
  },

  mockSupabaseResponse: (data: any, error: any = null) => ({
    data,
    error
  }),

  generateSecurePassword: () => 'SecureTestPassword123!',
  
  generateTestEmail: (prefix = 'test') => `${prefix}-${Date.now()}@example.com`
};

export const performanceTargets = {
  authentication: 1000,    // ms
  permissionCheck: 15,     // ms
  tenantSwitching: 200,    // ms
  databaseQuery: 50        // ms
};
