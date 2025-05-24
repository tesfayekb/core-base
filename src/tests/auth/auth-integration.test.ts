
// Authentication Integration Tests
// Following src/docs/implementation/testing/PHASE1_CORE_TESTING.md

import { authService } from '../../services/authService';
import { testHelpers, performanceTargets } from '../utils/test-helpers';

// Mock Supabase
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut
    }
  }
}));

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration Flow', () => {
    test('should complete registration within performance targets', async () => {
      mockSignUp.mockResolvedValue({
        data: { 
          user: { id: 'test-id', email: 'test@example.com' }, 
          session: null 
        },
        error: null
      });

      const { result, duration } = await testHelpers.measureExecutionTime(async () => {
        return await authService.signUp({
          email: testHelpers.generateTestEmail(),
          password: testHelpers.generateSecurePassword(),
          firstName: 'Test',
          lastName: 'User'
        });
      });

      expect(duration).toBeLessThan(performanceTargets.authentication);
      expect(result.success).toBe(true);
      expect(result.requiresVerification).toBe(true);
    });

    test('should handle registration errors gracefully', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' }
      });

      const result = await authService.signUp({
        email: 'existing@example.com',
        password: testHelpers.generateSecurePassword()
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Login Flow', () => {
    test('should complete login within performance targets', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { 
          user: { id: 'test-id', email: 'test@example.com' }, 
          session: { access_token: 'token' } 
        },
        error: null
      });

      const { result, duration } = await testHelpers.measureExecutionTime(async () => {
        return await authService.signIn('test@example.com', 'password123');
      });

      expect(duration).toBeLessThan(performanceTargets.authentication);
      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });

    test('should handle invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      const result = await authService.signIn('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('Security Validation', () => {
    test('should enforce password requirements', async () => {
      const weakPasswords = ['123', 'password', 'abc123'];

      for (const password of weakPasswords) {
        const result = await authService.signUp({
          email: testHelpers.generateTestEmail(),
          password
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    test('should validate email format', async () => {
      const invalidEmails = ['notanemail', 'test@', '@example.com', ''];

      for (const email of invalidEmails) {
        const result = await authService.signUp({
          email,
          password: testHelpers.generateSecurePassword()
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });
});
