
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementService } from '../UserManagementService';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null
      }))
    })),
    insert: vi.fn(() => ({
      data: [],
      error: null
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null
      }))
    }))
  }))
};

// Mock the database connection
vi.mock('@/services/database/connection', () => ({
  supabase: mockSupabaseClient
}));

describe('UserManagementService', () => {
  let userService: UserManagementService;

  beforeEach(() => {
    userService = new UserManagementService();
    vi.clearAllMocks();
  });

  it('should be instantiated', () => {
    expect(userService).toBeInstanceOf(UserManagementService);
  });

  it('should get users with pagination', async () => {
    const mockUsers = [
      {
        id: '1',
        email: 'test@example.com',
        tenant_id: 'tenant-1',
        first_name: 'Test',
        last_name: 'User',
        status: 'active',
        created_at: '2023-01-01T00:00:00Z'
      }
    ];

    // Mock the Supabase response
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
            count: 1
          })
        })
      })
    });

    const result = await userService.getUsers('tenant-1', { page: 1, limit: 10 });
    
    expect(result.data).toEqual(mockUsers);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('should handle user creation', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      tenant_id: 'tenant-1',
      first_name: 'Test',
      last_name: 'User',
      status: 'active' as const,
      created_at: '2023-01-01T00:00:00Z'
    };

    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUser,
            error: null
          })
        })
      })
    });

    const userData = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      tenantId: 'tenant-1'
    };

    const result = await userService.createUser(userData);
    
    expect(result.data).toEqual(mockUser);
    expect(result.error).toBeNull();
  });
});
