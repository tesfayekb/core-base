
// Email Verification Flow Testing
// Following src/docs/implementation/testing/PHASE1_CORE_TESTING.md

import { authService } from '../../services/authService';

// Create proper mocks
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword
    }
  }
}));

describe('Email Verification Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle signup with email verification required', async () => {
    mockSignUp.mockResolvedValue({
      data: { 
        user: { id: 'test-id', email: 'test@example.com', email_confirmed_at: null }, 
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
    expect(result.user?.email).toBe('test@example.com');
  });

  test('should prevent login with unverified email', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email not confirmed' }
    });

    const result = await authService.signIn('unverified@example.com', 'password123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Please confirm your email address before signing in');
  });

  test('should allow login after email verification', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { 
        user: { id: 'test-id', email: 'verified@example.com', email_confirmed_at: '2024-01-01' }, 
        session: { access_token: 'token' } 
      },
      error: null
    });

    const result = await authService.signIn('verified@example.com', 'password123');

    expect(result.success).toBe(true);
    expect(result.user?.email).toBe('verified@example.com');
  });
});
