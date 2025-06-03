
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementService, PaginationOptions } from '../UserManagementService';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
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
    }))
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

      vi.doMock('@/integrations/supabase/client', () => ({
        supabase: { from: mockFrom }
      }));

      const pagination: PaginationOptions = { page: 1, limit: 10 };
      const result = await UserManagementService.getUsers({}, pagination);

      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
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

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      await expect(UserManagementService.deleteUser('user-1')).resolves.not.toThrow();
    });
  });
});
