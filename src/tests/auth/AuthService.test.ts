
// Authentication Service Unit Tests
// Following src/docs/implementation/testing/PHASE1_CORE_TESTING.md

import { AuthService, authService } from '../../services/authService';
import { testHelpers } from '../utils/test-helpers';

// Create proper mocks for Supabase
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockResetPasswordForEmail = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail
    }
  }
}));

describe('AuthService Unit Tests', () => {
  let service: AuthService;

  beforeEach(() => {
    service = authService;
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    test('should register user successfully', async () => {
      const mockUser = { id: 'test-id', email: 'test@example.com' };
      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      });

      const result = await service.signUp({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
      expect(result.requiresVerification).toBe(true);
    });

    test('should validate email format', async () => {
      const result = await service.signUp({
        email: 'invalid-email',
        password: 'SecurePassword123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });

    test('should validate password length', async () => {
      const result = await service.signUp({
        email: 'test@example.com',
        password: 'short'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });
  });

  describe('signIn', () => {
    test('should login user successfully', async () => {
      const mockUser = { id: 'test-id', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };
      
      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const result = await service.signIn('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });

    test('should handle invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      const result = await service.signIn('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });
  });

  describe('Performance Requirements', () => {
    test('should complete authentication within 1000ms', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'test', email: 'test@example.com' }, session: {} },
        error: null
      });

      const startTime = performance.now();
      await service.signIn('test@example.com', 'password123');
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});
