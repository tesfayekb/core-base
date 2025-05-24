
// Phase 1 Authentication Validation Tests
// Following src/docs/implementation/testing/PHASE1_VALIDATION.md

import { authService } from '../../services/authService';
import { tenantContextService } from '../../services/SharedTenantContextService';
import { supabase } from '../../services/database';
import { performanceTargets } from '../utils/test-helpers';

jest.mock('../../services/database');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Phase 1 Authentication Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Functional Requirements Validation', () => {
    test('should complete full registration workflow', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { 
          user: { id: 'test-id', email: 'test@example.com' }, 
          session: null 
        },
        error: null
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(result.success).toBe(true);
      expect(result.requiresVerification).toBe(true);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            full_name: 'John Doe'
          }
        }
      });
    });

    test('should complete full login workflow', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: { id: 'test-id', email: 'test@example.com' }, 
          session: { access_token: 'token' } 
        },
        error: null
      });

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });
  });

  describe('Performance Validation', () => {
    test('should meet all authentication performance targets', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'test' }, session: {} },
        error: null
      });

      const startTime = performance.now();
      await authService.signIn('test@example.com', 'password123');
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(performanceTargets.authentication);
    });
  });

  describe('Security Validation', () => {
    test('should enforce input validation', async () => {
      const invalidInputs = [
        { email: 'invalid-email', password: 'short' },
        { email: '', password: 'SecurePassword123!' },
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
    test('should integrate with tenant context service', async () => {
      // This test validates that authentication doesn't break tenant context
      const contextSpy = jest.spyOn(tenantContextService, 'setUserContextAsync');
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'test-id' }, session: {} },
        error: null
      });

      await authService.signIn('test@example.com', 'password123');

      // Tenant context setup should be called (even if it fails non-blocking)
      expect(contextSpy).toHaveBeenCalledWith('test-id');
    });
  });
});
