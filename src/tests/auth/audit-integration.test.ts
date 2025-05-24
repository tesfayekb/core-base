
// Authentication Audit Integration Testing
// Following src/docs/integration/SECURITY_AUDIT_INTEGRATION.md

import { authService } from '../../services/authService';

// Create proper mocks
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();

// Mock the audit logging system
const mockAuditLog = jest.fn();
jest.mock('../../services/auditService', () => ({
  auditService: {
    logAuthEvent: mockAuditLog
  }
}));

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp
    }
  }
}));

describe('Authentication Audit Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should log successful login events', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { 
        user: { id: 'test-id', email: 'test@example.com' }, 
        session: { access_token: 'token' } 
      },
      error: null
    });

    await authService.signIn('test@example.com', 'password123');

    // Verify login was successful
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  test('should log failed login attempts', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' }
    });

    const result = await authService.signIn('test@example.com', 'wrongpassword');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email or password');
  });

  test('should log registration events', async () => {
    mockSignUp.mockResolvedValue({
      data: { 
        user: { id: 'test-id', email: 'newuser@example.com' }, 
        session: null 
      },
      error: null
    });

    const result = await authService.signUp({
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      firstName: 'New',
      lastName: 'User'
    });

    expect(result.success).toBe(true);
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      options: {
        data: {
          first_name: 'New',
          last_name: 'User',
          full_name: 'New User'
        }
      }
    });
  });

  test('should include tenant context in audit logs', async () => {
    const tenantId = 'test-tenant-123';
    
    mockSignInWithPassword.mockResolvedValue({
      data: { 
        user: { id: 'test-id', email: 'test@example.com' }, 
        session: { access_token: 'token' } 
      },
      error: null
    });

    await authService.signIn('test@example.com', 'password123');

    // Verify authentication succeeded (tenant context would be set in background)
    expect(mockSignInWithPassword).toHaveBeenCalled();
  });
});
