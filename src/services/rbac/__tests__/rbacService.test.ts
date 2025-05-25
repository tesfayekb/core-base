
import { RBACService } from '../rbacService';
import { BasicRBACService } from '../basicRbacService';
import { PermissionDependencyResolver } from '../permissionDependencies';
import { EntityBoundaryValidator } from '../entityBoundaries';

// Mock Supabase
jest.mock('../../database', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn()
    }))
  }
}));

describe('RBACService', () => {
  let rbacService: RBACService;
  let mockSupabase: any;

  beforeEach(() => {
    rbacService = RBACService.getInstance();
    mockSupabase = require('../../database').supabase;
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
        p_resource_id: null,
        p_tenant_id: null
      });
    });

    test('should handle permission dependencies', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: false, error: null }) // Direct permission check fails
        .mockResolvedValueOnce({ data: true, error: null }); // Update permission exists

      const result = await rbacService.checkPermission('user1', 'Read', 'documents');
      
      expect(result).toBe(true); // Should be true due to Update → Read dependency
    });

    test('should cache permission results', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      // First call
      await rbacService.checkPermission('user1', 'Read', 'documents');
      
      // Second call should use cache
      const result = await rbacService.checkPermission('user1', 'Read', 'documents');
      
      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    test('should handle SuperAdmin permissions', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { roles: { name: 'SuperAdmin' } }, error: null }))
            }))
          }))
        }))
      });

      const result = await rbacService.checkPermission('superuser', 'Delete', 'anything');
      
      expect(result).toBe(true);
    });
  });

  describe('Role Assignment', () => {
    test('should assign role with proper validation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ error: null }))
      });

      const result = await rbacService.assignRole('admin1', 'user1', 'role1', 'tenant1');
      
      expect(result.success).toBe(true);
    });

    test('should reject invalid role assignments', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => Promise.resolve({ error: { message: 'Permission denied' } }))
      });

      const result = await rbacService.assignRole('user1', 'user2', 'admin', 'tenant1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });
});

describe('PermissionDependencyResolver', () => {
  test('should resolve Update → Read dependency', async () => {
    const mockPermissionCheck = jest.fn()
      .mockResolvedValueOnce(false) // Read permission doesn't exist
      .mockResolvedValueOnce(true);  // Update permission exists

    const result = await PermissionDependencyResolver.checkPermissionWithDependencies(
      mockPermissionCheck,
      'Read',
      'documents'
    );

    expect(result).toBe(true);
    expect(mockPermissionCheck).toHaveBeenCalledWith('Read', 'documents', undefined);
    expect(mockPermissionCheck).toHaveBeenCalledWith('Update', 'documents', undefined);
  });

  test('should resolve Manage → all permissions dependency', async () => {
    const mockPermissionCheck = jest.fn()
      .mockResolvedValueOnce(false) // Delete permission doesn't exist
      .mockResolvedValueOnce(true);  // Manage permission exists

    const result = await PermissionDependencyResolver.checkPermissionWithDependencies(
      mockPermissionCheck,
      'Delete',
      'documents'
    );

    expect(result).toBe(true);
  });

  test('should handle ViewAny permissions', async () => {
    const mockPermissionCheck = jest.fn()
      .mockResolvedValueOnce(false) // Read permission doesn't exist
      .mockResolvedValueOnce(false) // Update permission doesn't exist
      .mockResolvedValueOnce(false) // Delete permission doesn't exist
      .mockResolvedValueOnce(false) // Manage permission doesn't exist
      .mockResolvedValueOnce(true);  // ViewAny permission exists

    const result = await PermissionDependencyResolver.checkPermissionWithDependencies(
      mockPermissionCheck,
      'Read',
      'documents'
    );

    expect(result).toBe(true);
  });
});

describe('EntityBoundaryValidator', () => {
  test('should allow operations within entity boundaries', async () => {
    const mockPermissionCheck = jest.fn().mockResolvedValue(true);

    const result = await EntityBoundaryValidator.validateEntityBoundary(
      {
        userId: 'user1',
        entityId: 'tenant1',
        operation: 'manage_users',
        targetUserId: 'user2'
      },
      mockPermissionCheck
    );

    expect(result).toBe(true);
  });

  test('should validate permission grants', async () => {
    const mockPermissionCheck = jest.fn().mockResolvedValue(true);

    const result = await EntityBoundaryValidator.canGrantPermission(
      {
        grantor: { userId: 'admin1', entityId: 'tenant1' },
        grantee: { userId: 'user1', entityId: 'tenant1' },
        permission: 'Read:documents'
      },
      mockPermissionCheck
    );

    expect(result.valid).toBe(true);
  });

  test('should reject cross-entity permission grants', async () => {
    const mockPermissionCheck = jest.fn()
      .mockResolvedValueOnce(true)  // Has the permission being granted
      .mockResolvedValueOnce(true)  // Has role management permissions
      .mockResolvedValueOnce(false); // No cross-entity permissions

    const result = await EntityBoundaryValidator.canGrantPermission(
      {
        grantor: { userId: 'admin1', entityId: 'tenant1' },
        grantee: { userId: 'user1', entityId: 'tenant2' },
        permission: 'Read:documents'
      },
      mockPermissionCheck
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Cross-entity permission grant not allowed');
  });
});
