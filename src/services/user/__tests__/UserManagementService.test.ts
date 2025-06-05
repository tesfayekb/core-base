
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementService } from '../UserManagementService';

// Mock Supabase
vi.mock('@/services/database', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          or: vi.fn(() => ({
            range: vi.fn(() => ({
              then: vi.fn()
            }))
          })),
          range: vi.fn(() => ({
            then: vi.fn()
          }))
        })),
        range: vi.fn(() => ({
          then: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    rpc: vi.fn()
  }
}));

describe('UserManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should fetch users with pagination', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          status: 'active',
          tenant_id: 'tenant-1',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      ];

      const mockSupabaseResponse = {
        data: mockUsers,
        error: null,
        count: 1
      };

      // Mock the Supabase chain
      const mockRange = vi.fn().mockResolvedValue(mockSupabaseResponse);
      const mockOr = vi.fn().mockReturnValue({ range: mockRange });
      const mockEq = vi.fn().mockReturnValue({ or: mockOr, range: mockRange });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, range: mockRange });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.doMock('@/services/database', () => ({
        supabase: { from: mockFrom }
      }));

      const result = await UserManagementService.getUsers({
        pagination: { page: 1, limit: 10 }
      });

      expect(result.users).toEqual(mockUsers);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        tenant_id: 'tenant-1'
      };

      const result = await UserManagementService.createUser(userData);
      expect(result).toBeDefined();
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name'
      };

      await expect(
        UserManagementService.updateUser('user-1', updateData)
      ).resolves.toBeDefined();
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      await expect(
        UserManagementService.getUserById('user-1')
      ).resolves.toBeDefined();
    });

    it('should return null for non-existent user', async () => {
      await expect(
        UserManagementService.getUserById('non-existent')
      ).resolves.toBeNull();
    });
  });

  describe('assignRoles', () => {
    it('should assign roles to user', async () => {
      await expect(
        UserManagementService.assignRoles('user-1', ['role-1', 'role-2'], 'tenant-1')
      ).resolves.not.toThrow();
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      await expect(UserManagementService.deleteUser('user-1')).resolves.not.toThrow();
    });
  });
});
