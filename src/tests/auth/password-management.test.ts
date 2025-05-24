
// Password Management Testing
// Following src/docs/implementation/testing/PHASE1_CORE_TESTING.md

import { authService } from '../../services/authService';

// Create proper mocks
const mockUpdateUser = jest.fn();
const mockResetPasswordForEmail = jest.fn();

jest.mock('../../services/database', () => ({
  supabase: {
    auth: {
      updateUser: mockUpdateUser,
      resetPasswordForEmail: mockResetPasswordForEmail
    }
  }
}));

describe('Password Management Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Updates', () => {
    test('should update password successfully', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: 'test-id' } },
        error: null
      });

      const result = await authService.updatePassword('NewSecurePassword123!');

      expect(result.success).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'NewSecurePassword123!'
      });
    });

    test('should validate password strength', async () => {
      const result = await authService.updatePassword('weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    test('should handle password update errors', async () => {
      mockUpdateUser.mockResolvedValue({
        data: null,
        error: { message: 'Password update failed' }
      });

      const result = await authService.updatePassword('ValidPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password update failed');
    });
  });

  describe('Password Reset', () => {
    test('should send password reset email', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password')
        })
      );
    });

    test('should validate email format for password reset', async () => {
      const result = await authService.resetPassword('invalid-email');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    test('should handle password reset errors', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      const result = await authService.resetPassword('notfound@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });
});
