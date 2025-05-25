
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Tenant Isolation Validation',
  testMatch: [
    '<rootDir>/src/tests/integration/Phase1TenantIsolationSuite.test.ts',
    '<rootDir>/src/tests/integration/Phase1TenantSecuritySuite.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 180000, // 3 minutes for comprehensive isolation testing
  maxWorkers: 1, // Run serially to avoid tenant context conflicts
  collectCoverageFrom: [
    'src/services/database/**/*.ts',
    'src/hooks/useTenantSecurity.ts',
    '!src/services/**/*.d.ts',
    '!src/services/**/__tests__/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'tenant-isolation-validation.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ]
};
