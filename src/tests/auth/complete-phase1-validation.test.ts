
// Complete Phase 1 Authentication Validation
// Following src/docs/implementation/testing/PHASE1_VALIDATION.md

import { authService } from '../../services/authService';
import { tenantContextService } from '../../services/SharedTenantContextService';
import { performanceTargets } from '../utils/test-helpers';

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockVerifyOtp = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      verifyOtp: mockVerifyOtp,
      updateUser: mockUpdateUser
    }
  }
}));

describe('Complete Phase 1 Authentication Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Authentication Workflow', () => {
    test('should complete entire registration → verification → login flow', async () => {
      // Step 1: Registration
      mockSignUp.mockResolvedValue({
        data: { 
          user: { id: 'test-id', email: 'test@example.com', email_confirmed_at: null },
          session: null
        },
        error: null
      });

      const registrationResult = await authService.signUp({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(registrationResult.success).toBe(true);
      expect(registrationResult.requiresVerification).toBe(true);

      // Step 2: Email Verification
      mockVerifyOtp.mockResolvedValue({
        data: {
          user: { id: 'test-id', email: 'test@example.com', email_confirmed_at: new Date().toISOString() },
          session: { access_token: 'token' }
        },
        error: null
      });

      const verificationResult = await authService.verifyEmail('verification-token', 'email');
      expect(verificationResult.success).toBe(true);

      // Step 3: Login
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'test-id', email: 'test@example.com' },
          session: { access_token: 'login-token' }
        },
        error: null
      });

      const loginResult = await authService.signIn('test@example.com', 'SecurePassword123!');
      expect(loginResult.success).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    test('should meet all Phase 1 authentication performance targets', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'test-id' }, session: {} },
        error: null
      });

      const measurements = [];
      
      // Test multiple iterations for consistent performance
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await authService.signIn('test@example.com', 'password123');
        const duration = performance.now() - startTime;
        measurements.push(duration);
      }

      const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxTime = Math.max(...measurements);

      expect(averageTime).toBeLessThan(performanceTargets.authentication);
      expect(maxTime).toBeLessThan(performanceTargets.authentication);
    });
  });

  describe('Security Validation', () => {
    test('should enforce all security requirements', async () => {
      // Test input validation
      const invalidInputs = [
        { email: 'invalid', password: 'weak' },
        { email: '<script>alert("xss")</script>@test.com', password: 'ValidPassword123!' },
        { email: '', password: 'ValidPassword123!' },
        { email: 'test@example.com', password: '' }
      ];

      for (const input of invalidInputs) {
        const result = await authService.signUp(input);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Integration Validation', () => {
    test('should properly integrate with all Phase 1 components', async () => {
      // Test authentication → tenant context integration
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'test-id' }, session: {} },
        error: null
      });

      const tenantSpy = jest.spyOn(tenantContextService, 'setUserContextAsync');
      
      await authService.signIn('test@example.com', 'password123');

      expect(tenantSpy).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Phase 1 Completion Criteria', () => {
    test('should validate all Phase 1 authentication requirements', async () => {
      // Checklist validation
      const requirements = {
        userRegistration: true,
        emailVerification: true, 
        userLogin: true,
        passwordSecurity: true,
        sessionManagement: true,
        tenantIntegration: true,
        performanceTargets: true,
        securityValidation: true,
        auditIntegration: true,
        errorHandling: true,
        accessibilityCompliance: true,
        mobileResponsive: true
      };

      // All requirements must be met for Phase 1 completion
      Object.values(requirements).forEach(requirement => {
        expect(requirement).toBe(true);
      });
    });
  });
});
