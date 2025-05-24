
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Phase 1.2 Validation',
  testMatch: [
    '<rootDir>/src/tests/integration/Phase1ValidationSuite.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 120000, // 2 minutes for comprehensive validation
  maxWorkers: 1, // Run serially for accurate validation
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/services/**/*.d.ts',
    '!src/services/**/__tests__/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'phase1-validation.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ]
};
