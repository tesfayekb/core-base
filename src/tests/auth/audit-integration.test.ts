
// Authentication Audit Integration Tests
// Following src/docs/integration/SECURITY_AUDIT_INTEGRATION.md

import { authService } from '../../services/authService';
import { auditService } from '../../services/auditService';

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut
    }
  }
}));

jest.mock('../../services/auditService', () => ({
  auditService: {
    logAuthEvent: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));

describe('Authentication Audit Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should log successful login events', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'test-id', email: 'test@example.com' }, session: {} },
      error: null
    });

    await authService.signIn('test@example.com', 'password123');

    expect(auditService.logAuthEvent).toHaveBeenCalledWith({
      event: 'user_login_success',
      userId: 'test-id',
      email: 'test@example.com',
      timestamp: expect.any(Date)
    });
  });

  test('should log failed login attempts', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' }
    });

    await authService.signIn('test@example.com', 'wrongpassword');

    expect(auditService.logSecurityEvent).toHaveBeenCalledWith({
      event: 'user_login_failed',
      email: 'test@example.com',
      reason: 'invalid_credentials',
      timestamp: expect.any(Date)
    });
  });

  test('should log registration events', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-id', email: 'new@example.com' } },
      error: null
    });

    await authService.signUp({
      email: 'new@example.com',
      password: 'password123'
    });

    expect(auditService.logAuthEvent).toHaveBeenCalledWith({
      event: 'user_registration',
      userId: 'new-id',
      email: 'new@example.com',
      timestamp: expect.any(Date)
    });
  });
});
