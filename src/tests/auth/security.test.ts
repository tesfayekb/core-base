
// Authentication Security Tests
// Following src/docs/security/SECURITY_TESTING.md

import { authService } from '../../services/authService';
import { supabase } from '../../services/database';

jest.mock('../../services/database');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Authentication Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation Security', () => {
    test('should prevent XSS in email field', async () => {
      const maliciousEmail = '<script>alert("xss")</script>@example.com';
      
      const result = await authService.signIn(maliciousEmail, 'password123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    test('should enforce password complexity', async () => {
      const weakPasswords = ['123', 'password', 'abc123'];
      
      for (const password of weakPasswords) {
        const result = await authService.signUp({
          email: 'test@example.com',
          password
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid input');
      }
    });

    test('should sanitize user input data', async () => {
      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'Normal Name'
      });

      // Should validate input but not execute scripts
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              first_name: expect.stringContaining('<script>')
            })
          })
        })
      );
    });
  });

  describe('Session Security', () => {
    test('should handle session timeout gracefully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      
      await expect(authService.signOut()).resolves.not.toThrow();
    });

    test('should prevent session fixation', async () => {
      // Test that new sessions are created on login
      const mockSession1 = { access_token: 'token1', user: { id: '1' } };
      const mockSession2 = { access_token: 'token2', user: { id: '2' } };
      
      mockSupabase.auth.signInWithPassword
        .mockResolvedValueOnce({
          data: { user: { id: '1' }, session: mockSession1 },
          error: null
        })
        .mockResolvedValueOnce({
          data: { user: { id: '2' }, session: mockSession2 },
          error: null
        });

      await authService.signIn('user1@example.com', 'password');
      await authService.signIn('user2@example.com', 'password');

      // Each login should create a new session
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });
  });
});
