
import '@testing-library/jest-dom';

// Mock Supabase client for testing
jest.mock('../services/database', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn()
    }))
  }
}));

// Global test configuration
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Suppress console.log during tests unless needed
  log: jest.fn(),
  warn: jest.fn(), 
  error: jest.fn()
};

// Setup global test environment
beforeAll(() => {
  // Global test setup
});

afterAll(() => {
  // Global test cleanup
});
