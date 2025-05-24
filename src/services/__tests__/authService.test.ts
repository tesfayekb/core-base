
import { AuthService, authService } from '../authService';
import { createMockSupabaseClient } from '../../tests/testUtils';

// Mock the database module
jest.mock('../database', () => ({
  supabase: createMockSupabaseClient()
}));

describe('AuthService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = require('../database').supabase;
    jest.clearAllMocks();
  });

  describe('User Registration', () => {
    it('should register user successfully with valid credentials', async () => {
      // Mock successful signup
      mockSupabase.auth = {
        signUp: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com'
            },
            session: {
              access_token: 'test-token'
            }
          },
          error: null
        })
      };

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            full_name: 'John Doe'
          }
        }
      });
    });

    it('should handle registration errors gracefully', async () => {
      mockSupabase.auth = {
        signUp: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User already registered' }
        })
      };

      const result = await authService.signUp({
        email: 'existing@example.com',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account with this email already exists');
    });

    it('should validate input format', async () => {
      const result = await authService.signUp({
        email: 'invalid-email',
        password: '123' // Too short
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });
  });

  describe('User Login', () => {
    it('should login user successfully with valid credentials', async () => {
      mockSupabase.auth = {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com'
            },
            session: {
              access_token: 'test-token'
            }
          },
          error: null
        })
      };

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should handle login errors gracefully', async () => {
      mockSupabase.auth = {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid login credentials' }
        })
      };

      const result = await authService.signIn('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should validate login input format', async () => {
      const result = await authService.signIn('invalid-email', '123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password format');
    });
  });

  describe('Password Reset', () => {
    it('should initiate password reset successfully', async () => {
      mockSupabase.auth = {
        resetPasswordForEmail: jest.fn().mockResolvedValue({
          error: null
        })
      };

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: `${window.location.origin}/reset-password` }
      );
    });

    it('should handle password reset errors', async () => {
      mockSupabase.auth = {
        resetPasswordForEmail: jest.fn().mockResolvedValue({
          error: { message: 'User not found' }
        })
      };

      const result = await authService.resetPassword('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('User Logout', () => {
    it('should logout user successfully', async () => {
      mockSupabase.auth = {
        signOut: jest.fn().mockResolvedValue({
          error: null
        })
      };

      await expect(authService.signOut()).resolves.not.toThrow();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      mockSupabase.auth = {
        signOut: jest.fn().mockResolvedValue({
          error: { message: 'Logout failed' }
        })
      };

      await expect(authService.signOut()).rejects.toThrow();
    });
  });
});
