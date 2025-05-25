
import { RBACService } from '../rbacService';
import { BasicRBACService } from '../basicRbacService';

// Mock Supabase
jest.mock('../../../integrations/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    }))
  }
}));

describe('RBACService', () => {
  let rbacService: RBACService;
  let mockSupabase: any;

  beforeEach(() => {
    rbacService = RBACService.getInstance();
    mockSupabase = require('../../../integrations/supabase/client').supabase;
    rbacService.clearCache();
  });

  describe('Permission Checking', () => {
    test('should check direct permissions correctly', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = await rbacService.checkPermission('user1', 'Read', 'documents');
      
      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_user_permission', {
        p_user_id: 'user1',
        p_action: 'Read',
        p_resource: 'documents',
        p_resource_id: null
      });
    });

    test('should cache permission results', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      // First call
      await rbacService.checkPermission('user1', 'Read', 'documents');
      
      // Second call should use cache
      const result = await rbacService.checkPermission('user1', 'Read', 'documents');
      
      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });
  });

  describe('Role Assignment', () => {
    test('should assign role with proper validation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ error: null }))
      });

      const result = await rbacService.assignRole('user1', 'role1');
      
      expect(result.success).toBe(true);
    });

    test('should reject invalid role assignments', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ error: { message: 'Permission denied' } }))
      });

      const result = await rbacService.assignRole('user1', 'admin');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });
});
