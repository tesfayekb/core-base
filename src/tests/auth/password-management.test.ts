
// Password Management Tests
// Following src/docs/security/AUTH_SYSTEM.md requirements

import { authService } from '../../services/authService';

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

describe('Password Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Updates', () => {
    test('should update password with valid new password', async () => {
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

    test('should reject weak passwords', async () => {
      const weakPasswords = ['123', 'password', 'abc123'];

      for (const password of weakPasswords) {
        const result = await authService.updatePassword(password);
        expect(result.success).toBe(false);
        expect(result.error).toContain('at least 8 characters');
      }
    });

    test('should handle password update errors', async () => {
      mockUpdateUser.mockResolvedValue({
        data: null,
        error: { message: 'Current password is incorrect' }
      });

      const result = await authService.updatePassword('NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Password Reset Flow', () => {
    test('should initiate password reset successfully', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await authService.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: `${window.location.origin}/reset-password` }
      );
    });

    test('should validate email format for reset', async () => {
      const result = await authService.resetPassword('invalid-email');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });
  });
});
