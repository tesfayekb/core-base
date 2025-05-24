
import { rateLimitService } from '../../services/auth/RateLimitService';

// Reset rate limit service before each test
beforeEach(() => {
  // Clear all attempts
  const service = rateLimitService as any;
  service.attempts.clear();
});

describe('RateLimitService', () => {
  const testEmail = 'test@example.com';

  describe('Rate Limiting Logic', () => {
    test('should allow login attempts under limit', () => {
      const status = rateLimitService.checkRateLimit(testEmail);
      
      expect(status.isLocked).toBe(false);
      expect(status.remainingAttempts).toBe(5);
    });

    test('should track failed attempts', () => {
      // Record 3 failed attempts
      for (let i = 0; i < 3; i++) {
        rateLimitService.recordAttempt(testEmail, false);
      }
      
      const status = rateLimitService.checkRateLimit(testEmail);
      expect(status.remainingAttempts).toBe(2);
      expect(status.isLocked).toBe(false);
    });

    test('should lock account after max failed attempts', () => {
      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        rateLimitService.recordAttempt(testEmail, false);
      }
      
      const status = rateLimitService.checkRateLimit(testEmail);
      expect(status.isLocked).toBe(true);
      expect(status.remainingAttempts).toBe(0);
      expect(status.lockoutEndTime).toBeDefined();
    });

    test('should clear attempts on successful login', () => {
      // Record some failed attempts
      rateLimitService.recordAttempt(testEmail, false);
      rateLimitService.recordAttempt(testEmail, false);
      
      // Clear attempts
      rateLimitService.clearAttempts(testEmail);
      
      const status = rateLimitService.checkRateLimit(testEmail);
      expect(status.remainingAttempts).toBe(5);
    });

    test('should enforce minimum delay between attempts', () => {
      rateLimitService.recordAttempt(testEmail, false);
      
      const status = rateLimitService.checkRateLimit(testEmail);
      expect(status.nextAttemptAllowed).toBeGreaterThan(Date.now());
    });
  });

  describe('Email Normalization', () => {
    test('should normalize email case', () => {
      rateLimitService.recordAttempt('TEST@EXAMPLE.COM', false);
      rateLimitService.recordAttempt('test@example.com', false);
      
      const status = rateLimitService.checkRateLimit('Test@Example.Com');
      expect(status.remainingAttempts).toBe(3); // Should count both attempts
    });
  });

  describe('Rate Limit Info', () => {
    test('should provide correct rate limit statistics', () => {
      // Add attempts for multiple users
      rateLimitService.recordAttempt('user1@example.com', false);
      rateLimitService.recordAttempt('user2@example.com', false);
      
      const info = rateLimitService.getRateLimitInfo();
      expect(info.totalUsers).toBe(2);
      expect(info.lockedUsers).toBe(0);
    });
  });
});
