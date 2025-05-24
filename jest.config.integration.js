
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/src/services/**/__tests__/*Integration.test.ts',
    '<rootDir>/src/services/**/__tests__/*LoadTesting.test.ts',
    '<rootDir>/src/services/**/__tests__/*ChaosEngineering.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 60000, // 60 seconds for integration tests
  maxWorkers: 1, // Run serially to avoid conflicts
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/services/**/*.d.ts',
    '!src/services/**/__tests__/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
