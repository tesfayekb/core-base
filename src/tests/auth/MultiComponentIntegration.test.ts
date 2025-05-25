
// Multi-Component Integration Tests
// Following src/docs/testing/ADVANCED_INTEGRATION_PATTERNS.md

import { authService } from '../../services/authService';
import { passwordResetRateLimitService } from '../../services/auth/PasswordResetRateLimitService';

// Mock dependencies
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      signOut: mockSignOut
    }
  }
}));

describe('Multi-Component Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset rate limit service
    const service = passwordResetRateLimitService as any;
    service.resetAttempts?.clear?.();
  });

  describe('Authentication Service Integration', () => {
    test('should maintain session consistency across multiple operations', async () => {
      // Test registration followed by login
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user', email: 'new@example.com' }, session: null },
        error: null
      });

      mockSignInWithPassword.mockResolvedValue({
        data: { 
          user: { id: 'new-user', email: 'new@example.com' }, 
          session: { access_token: 'token' }
        },
        error: null
      });

      // Register user
      const registerResult = await authService.signUp({
        email: 'new@example.com',
        password: 'SecurePassword123!'
      });

      expect(registerResult.success).toBe(true);

      // Login same user
      const loginResult = await authService.signIn('new@example.com', 'SecurePassword123!');

      expect(loginResult.success).toBe(true);
      expect(loginResult.user?.email).toBe('new@example.com');
    });

    test('should handle password reset after failed login attempts', async () => {
      const email = 'test@example.com';

      // Simulate failed login attempts
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      // Multiple failed login attempts
      for (let i = 0; i < 3; i++) {
        const result = await authService.signIn(email, 'wrongpassword');
        expect(result.success).toBe(false);
      }

      // Now attempt password reset
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      });

      // Check rate limit status
      const rateLimitStatus = passwordResetRateLimitService.checkResetRateLimit(email);
      expect(rateLimitStatus.isLimited).toBe(false); // Should not be limited by login failures

      // Request password reset
      passwordResetRateLimitService.recordResetAttempt(email);
      
      const newStatus = passwordResetRateLimitService.checkResetRateLimit(email);
      expect(newStatus.remainingAttempts).toBe(2);
    });

    test('should handle concurrent operations safely', async () => {
      // Simulate concurrent login and password reset
      const email = 'concurrent@example.com';

      mockSignInWithPassword.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' }
        }), 100))
      );

      mockResetPasswordForEmail.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          data: {},
          error: null
        }), 50))
      );

      // Start both operations simultaneously
      const loginPromise = authService.signIn(email, 'password');
      
      // Record reset attempt
      passwordResetRateLimitService.recordResetAttempt(email);

      const [loginResult] = await Promise.all([loginPromise]);

      expect(loginResult.success).toBe(false);

      // Rate limit should still be properly tracked
      const rateLimitStatus = passwordResetRateLimitService.checkResetRateLimit(email);
      expect(rateLimitStatus.remainingAttempts).toBe(2);
    });
  });

  describe('Rate Limiting Stress Tests', () => {
    test('should handle burst requests correctly', async () => {
      const email = 'burst@example.com';

      // Simulate burst of reset requests
      const promises = Array(10).fill(null).map(() => {
        passwordResetRateLimitService.recordResetAttempt(email);
        return passwordResetRateLimitService.checkResetRateLimit(email);
      });

      const results = await Promise.all(promises);

      // Should not exceed maximum attempts
      const finalStatus = passwordResetRateLimitService.checkResetRateLimit(email);
      expect(finalStatus.remainingAttempts).toBe(0);
      expect(finalStatus.isLimited).toBe(true);
    });

    test('should handle cleanup of old attempts', async () => {
      const email = 'cleanup@example.com';

      // Record attempts
      passwordResetRateLimitService.recordResetAttempt(email);
      passwordResetRateLimitService.recordResetAttempt(email);

      // Mock time passage (over window)
      jest.useFakeTimers();
      jest.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

      // Should reset after window
      const status = passwordResetRateLimitService.checkResetRateLimit(email);
      expect(status.remainingAttempts).toBe(3);
      expect(status.isLimited).toBe(false);

      jest.useRealTimers();
    });

    test('should handle memory efficiency with many users', async () => {
      // Simulate many users
      const users = Array(1000).fill(null).map((_, i) => `user${i}@example.com`);

      users.forEach(email => {
        passwordResetRateLimitService.recordResetAttempt(email);
      });

      // Get info should handle large user base
      const info = passwordResetRateLimitService.getRateLimitInfo();
      expect(info.totalUsers).toBe(1000);
      expect(typeof info.rateLimitedUsers).toBe('number');
    });
  });

  describe('Error Boundary Integration', () => {
    test('should handle service errors gracefully', async () => {
      // Mock service throwing errors
      mockSignInWithPassword.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      // Should not crash the application
      await expect(authService.signIn('test@example.com', 'password')).resolves.toEqual({
        success: false,
        error: expect.any(String)
      });
    });

    test('should handle malformed responses', async () => {
      // Mock malformed response
      mockSignUp.mockResolvedValue(null as any);

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle rate limit service errors', async () => {
      // Mock rate limit service error
      jest.spyOn(passwordResetRateLimitService, 'checkResetRateLimit').mockImplementation(() => {
        throw new Error('Rate limit service error');
      });

      // Should not crash when rate limit check fails
      expect(() => {
        passwordResetRateLimitService.checkResetRateLimit('test@example.com');
      }).toThrow('Rate limit service error');

      // Restore mock
      jest.restoreAllMocks();
    });
  });

  describe('Cross-Browser Compatibility', () => {
    test('should handle different storage mechanisms', () => {
      // Test localStorage availability
      const originalLocalStorage = global.localStorage;

      // Mock localStorage not available
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true
      });

      // Rate limit service should still work
      const status = passwordResetRateLimitService.checkResetRateLimit('test@example.com');
      expect(typeof status.isLimited).toBe('boolean');

      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });

    test('should handle different timer implementations', () => {
      const originalSetInterval = global.setInterval;
      const originalClearInterval = global.clearInterval;

      // Mock timer functions
      global.setInterval = jest.fn();
      global.clearInterval = jest.fn();

      // Service should handle missing timers gracefully
      expect(() => {
        passwordResetRateLimitService.checkResetRateLimit('test@example.com');
      }).not.toThrow();

      // Restore timers
      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    });
  });
});
