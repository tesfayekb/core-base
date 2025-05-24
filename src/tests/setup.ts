// Test Setup Configuration
// Configures testing environment for integration tests with Supabase

import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';

// Global test configuration
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});

// Global error handler for tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Suppress console logs during tests (except errors)
const originalConsole = console;
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  // Keep console.error for debugging
});

afterAll(() => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
});
