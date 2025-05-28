
import { UserManagementService } from '../UserManagementService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis()
    })),
    rpc: jest.fn()
  }
}));

describe('UserManagementService', () => {
  let userService: UserManagementService;
  const mockSupabase = supabase as any;

  beforeEach(() => {
    userService = new UserManagementService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    test('should create user with valid data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        tenant_id: 'tenant-123'
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockUser,
        error: null
      });

      const createRequest = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant-123'
      };

      const result = await userService.createUser(createRequest, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe('test@example.com');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    test('should handle email validation error', async () => {
      const createRequest = {
        email: 'invalid-email',
        tenantId: 'tenant-123'
      };

      const result = await userService.createUser(createRequest, 'admin-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('valid email');
    });
  });

  describe('updateUser', () => {
    test('should update user successfully', async () => {
      const mockUpdatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Smith'
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockUpdatedUser,
        error: null
      });

      const updateRequest = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const result = await userService.updateUser('user-123', updateRequest, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.data?.first_name).toBe('Jane');
    });
  });

  describe('getUsers', () => {
    test('should retrieve users for tenant with caching', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', tenant_id: 'tenant-123' },
        { id: 'user-2', email: 'user2@example.com', tenant_id: 'tenant-123' }
      ];

      mockSupabase.from().mockResolvedValue({
        data: mockUsers,
        error: null
      });

      // First call
      const result1 = await userService.getUsers('tenant-123');
      
      // Second call should use cache
      const result2 = await userService.getUsers('tenant-123');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data).toHaveLength(2);
      
      // Should only call database once due to caching
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });
});
