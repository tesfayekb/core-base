
import { passwordResetRateLimitService } from '../../services/auth/PasswordResetRateLimitService';
import { authService } from '../../services/authService';

// Mock dependencies
const mockSignUp = jest.fn();
const mockResetPasswordForEmail = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail
    }
  }
}));

describe('Password Security Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const service = passwordResetRateLimitService as any;
    service.resetAttempts.clear();
  });

  describe('Password Validation Edge Cases', () => {
    test('should handle Unicode characters in passwords', async () => {
      const unicodePassword = 'Pässwörd123!@#';
      
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'test' }, session: null },
        error: null
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: unicodePassword
      });

      expect(result.success).toBe(true);
    });

    test('should reject passwords with only Unicode special characters', async () => {
      const weakUnicodePassword = 'pässwörd';

      const result = await authService.signUp({
        email: 'test@example.com',
        password: weakUnicodePassword
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password does not meet security requirements');
    });

    test('should handle extremely long passwords', async () => {
      const longPassword = 'A'.repeat(1000) + '1!';
      
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'test' }, session: null },
        error: null
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: longPassword
      });

      expect(result.success).toBe(true);
    });

    test('should detect sophisticated common patterns', async () => {
      const sophisticatedPatterns = [
        'Password123!', // Common word + numbers + special
        'Qwerty123!',   // Keyboard pattern
        'Admin123!',    // Role-based password
        'Welcome123!',  // Welcome pattern
        'Company123!'   // Generic company password
      ];

      for (const password of sophisticatedPatterns) {
        const result = await authService.signUp({
          email: `test${Date.now()}@example.com`,
          password
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Password does not meet security requirements');
      }
    });

    test('should handle password with mixed script characters', async () => {
      const mixedScriptPassword = 'Пароль123!'; // Cyrillic + Latin + numbers + special
      
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'test' }, session: null },
        error: null
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: mixedScriptPassword
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Rate Limiting Edge Cases', () => {
    test('should handle concurrent reset requests for same email', async () => {
      const email = 'concurrent@example.com';
      
      // Simulate multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => 
        passwordResetRateLimitService.checkResetRateLimit(email)
      );

      const results = await Promise.all(promises);
      
      // All should return consistent results
      expect(results.every(r => r.remainingAttempts === 3)).toBe(true);
    });

    test('should handle email case sensitivity correctly', async () => {
      const baseEmail = 'Test@Example.Com';
      const variations = [
        'test@example.com',
        'TEST@EXAMPLE.COM',
        'Test@Example.Com',
        'tEsT@eXaMpLe.CoM'
      ];

      // Record attempt with one variation
      passwordResetRateLimitService.recordResetAttempt(variations[0]);

      // Check all variations should be treated as same email
      for (const email of variations) {
        const status = passwordResetRateLimitService.checkResetRateLimit(email);
        expect(status.remainingAttempts).toBe(2);
      }
    });

    test('should handle system clock changes gracefully', async () => {
      const email = 'clock@example.com';
      
      // Record attempt
      passwordResetRateLimitService.recordResetAttempt(email);
      
      // Simulate clock going backwards (should not cause negative times)
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() - 1000);
      
      const status = passwordResetRateLimitService.checkResetRateLimit(email);
      expect(status.nextAttemptAllowed).toBeGreaterThanOrEqual(Date.now());
      
      // Restore original Date.now
      Date.now = originalNow;
    });

    test('should handle memory cleanup correctly', async () => {
      const service = passwordResetRateLimitService as any;
      
      // Create many old attempts
      for (let i = 0; i < 100; i++) {
        const email = `user${i}@example.com`;
        service.resetAttempts.set(email, [{
          email,
          timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
        }]);
      }

      // Trigger cleanup
      service.cleanupOldAttempts();

      // All old attempts should be removed
      expect(service.resetAttempts.size).toBe(0);
    });
  });

  describe('Email Validation Edge Cases', () => {
    test('should handle internationalized domain names', async () => {
      const idnEmails = [
        'test@münchen.de',
        'user@北京.中国',
        'admin@москва.рф'
      ];

      for (const email of idnEmails) {
        const result = await authService.signUp({
          email,
          password: 'SecurePassword123!'
        });

        // Should handle IDN emails gracefully (may accept or reject consistently)
        expect(typeof result.success).toBe('boolean');
        expect(result.error).toBeDefined();
      }
    });

    test('should handle emails with special characters', async () => {
      const specialEmails = [
        'test+tag@example.com',
        'user.name@example.com',
        'admin_user@example.com',
        'test-user@example.com'
      ];

      mockSignUp.mockResolvedValue({
        data: { user: { id: 'test' }, session: null },
        error: null
      });

      for (const email of specialEmails) {
        const result = await authService.signUp({
          email,
          password: 'SecurePassword123!'
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle network timeouts gracefully', async () => {
      mockSignUp.mockRejectedValue(new Error('Network timeout'));

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'SecurePassword123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle malformed API responses', async () => {
      mockSignUp.mockResolvedValue({
        data: null,
        error: null // Malformed: both null
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'SecurePassword123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
