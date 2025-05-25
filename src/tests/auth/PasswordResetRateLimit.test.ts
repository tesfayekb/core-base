
import { passwordResetRateLimitService } from '../../services/auth/PasswordResetRateLimitService';

// Reset rate limit service before each test
beforeEach(() => {
  const service = passwordResetRateLimitService as any;
  service.resetAttempts.clear();
});

describe('PasswordResetRateLimitService', () => {
  const testEmail = 'test@example.com';

  describe('Rate Limiting Logic', () => {
    test('should allow reset requests under limit', () => {
      const status = passwordResetRateLimitService.checkResetRateLimit(testEmail);
      
      expect(status.isLimited).toBe(false);
      expect(status.remainingAttempts).toBe(3);
    });

    test('should track reset attempts', () => {
      passwordResetRateLimitService.recordResetAttempt(testEmail);
      passwordResetRateLimitService.recordResetAttempt(testEmail);
      
      const status = passwordResetRateLimitService.checkResetRateLimit(testEmail);
      expect(status.remainingAttempts).toBe(1);
      expect(status.isLimited).toBe(false);
    });

    test('should limit after max attempts', () => {
      // Record 3 reset attempts
      for (let i = 0; i < 3; i++) {
        passwordResetRateLimitService.recordResetAttempt(testEmail);
      }
      
      const status = passwordResetRateLimitService.checkResetRateLimit(testEmail);
      expect(status.isLimited).toBe(true);
      expect(status.remainingAttempts).toBe(0);
    });

    test('should enforce minimum delay between attempts', () => {
      passwordResetRateLimitService.recordResetAttempt(testEmail);
      
      const status = passwordResetRateLimitService.checkResetRateLimit(testEmail);
      expect(status.nextAttemptAllowed).toBeGreaterThan(Date.now());
    });

    test('should normalize email case', () => {
      passwordResetRateLimitService.recordResetAttempt('TEST@EXAMPLE.COM');
      passwordResetRateLimitService.recordResetAttempt('test@example.com');
      
      const status = passwordResetRateLimitService.checkResetRateLimit('Test@Example.Com');
      expect(status.remainingAttempts).toBe(1); // Should count both attempts
    });
  });

  describe('Rate Limit Info', () => {
    test('should provide correct statistics', () => {
      passwordResetRateLimitService.recordResetAttempt('user1@example.com');
      passwordResetRateLimitService.recordResetAttempt('user2@example.com');
      
      const info = passwordResetRateLimitService.getRateLimitInfo();
      expect(info.totalUsers).toBe(2);
      expect(info.rateLimitedUsers).toBe(0);
    });
  });
});
