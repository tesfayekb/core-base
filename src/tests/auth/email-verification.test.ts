
// Email Verification Flow Tests
// Following src/docs/implementation/testing/PHASE1_CORE_TESTING.md

import { authService } from '../../services/authService';

const mockVerifyOtp = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      verifyOtp: mockVerifyOtp
    }
  }
}));

describe('Email Verification Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should verify email with valid token', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { 
        user: { id: 'test-id', email: 'test@example.com', email_confirmed_at: new Date().toISOString() },
        session: { access_token: 'token' }
      },
      error: null
    });

    const result = await authService.verifyEmail('valid-token', 'email');

    expect(result.success).toBe(true);
    expect(result.user?.email_confirmed_at).toBeDefined();
  });

  test('should handle invalid verification token', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Token has expired or is invalid' }
    });

    const result = await authService.verifyEmail('invalid-token', 'email');

    expect(result.success).toBe(false);
    expect(result.error).toContain('expired or invalid');
  });

  test('should complete email verification within performance target', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: 'test-id' }, session: {} },
      error: null
    });

    const startTime = performance.now();
    await authService.verifyEmail('valid-token', 'email');
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(1000);
  });
});
