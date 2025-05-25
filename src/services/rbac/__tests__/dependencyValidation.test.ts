
import { DependencyValidationService } from '../DependencyValidationService';
import { granularDependencyResolver } from '../GranularDependencyResolver';
import { rbacService } from '../rbacService';

// Mock dependencies
jest.mock('../rbacService');
jest.mock('../GranularDependencyResolver');

describe('DependencyValidationService', () => {
  let validationService: DependencyValidationService;
  let mockRbacService: jest.Mocked<typeof rbacService>;
  let mockDependencyResolver: jest.Mocked<typeof granularDependencyResolver>;

  beforeEach(() => {
    validationService = DependencyValidationService.getInstance();
    mockRbacService = rbacService as jest.Mocked<typeof rbacService>;
    mockDependencyResolver = granularDependencyResolver as jest.Mocked<typeof granularDependencyResolver>;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('validateRoleAssignment', () => {
    test('should validate admin role assignment with all dependencies', async () => {
      // Mock admin role permissions
      mockDependencyResolver.resolvePermissionWithDependencies.mockResolvedValue({
        granted: true,
        missingDependencies: [],
        resolutionPath: ['users:manage', 'roles:view']
      });

      mockRbacService.getUserPermissions.mockResolvedValue([
        { id: '1', tenant_id: 'tenant1', name: 'Manage Users', resource: 'users', action: 'manage', created_at: '2023-01-01' },
        { id: '2', tenant_id: 'tenant1', name: 'View Roles', resource: 'roles', action: 'view', created_at: '2023-01-01' }
      ]);

      const result = await validationService.validateRoleAssignment(
        'admin-user-id',
        'admin-role-id',
        'target-user-id',
        'tenant1'
      );

      expect(result.valid).toBe(true);
      expect(result.missingDependencies).toEqual([]);
      expect(result.warnings).toContain('Role contains high-privilege permissions: users:manage, roles:manage, permissions:manage, tenants:manage, settings:manage');
    });

    test('should detect missing dependencies for role assignment', async () => {
      mockDependencyResolver.resolvePermissionWithDependencies.mockResolvedValue({
        granted: false,
        missingDependencies: ['users:view', 'roles:view'],
        resolutionPath: ['users:manage']
      });

      mockRbacService.getUserPermissions.mockResolvedValue([]);

      const result = await validationService.validateRoleAssignment(
        'limited-user-id',
        'admin-role-id',
        'target-user-id',
        'tenant1'
      );

      expect(result.valid).toBe(false);
      expect(result.missingDependencies).toContain('users:view');
      expect(result.missingDependencies).toContain('roles:view');
    });

    test('should handle non-existent role', async () => {
      const result = await validationService.validateRoleAssignment(
        'user-id',
        'non-existent-role',
        'target-user-id',
        'tenant1'
      );

      expect(result.valid).toBe(false);
      expect(result.missingDependencies).toContain('ROLE_NOT_FOUND');
      expect(result.warnings).toContain('Role has no permissions or does not exist');
    });
  });

  describe('validatePermissionAssignment', () => {
    test('should validate individual permission with dependencies', async () => {
      mockDependencyResolver.resolvePermissionWithDependencies.mockResolvedValue({
        granted: true,
        missingDependencies: [],
        resolutionPath: ['users:update', 'users:view']
      });

      mockRbacService.getUserPermissions.mockResolvedValue([
        { id: '1', tenant_id: 'tenant1', name: 'Update Users', resource: 'users', action: 'update', created_at: '2023-01-01' },
        { id: '2', tenant_id: 'tenant1', name: 'View Users', resource: 'users', action: 'view', created_at: '2023-01-01' }
      ]);

      const result = await validationService.validatePermissionAssignment(
        'user-id',
        'users:update',
        'tenant1'
      );

      expect(result.valid).toBe(true);
      expect(result.requiredPermissions).toEqual(['users:update', 'users:view']);
      expect(result.assignerCapabilities).toContain('update:users');
    });

    test('should detect missing permission dependencies', async () => {
      mockDependencyResolver.resolvePermissionWithDependencies.mockResolvedValue({
        granted: false,
        missingDependencies: ['users:view'],
        resolutionPath: ['users:delete', 'users:view']
      });

      mockRbacService.getUserPermissions.mockResolvedValue([
        { id: '1', tenant_id: 'tenant1', name: 'Delete Users', resource: 'users', action: 'delete', created_at: '2023-01-01' }
      ]);

      const result = await validationService.validatePermissionAssignment(
        'user-id',
        'users:delete',
        'tenant1'
      );

      expect(result.valid).toBe(false);
      expect(result.missingPermissions).toContain('users:view');
      expect(result.assignerCapabilities).toContain('delete:users');
    });
  });

  describe('preValidateRoleAssignment', () => {
    test('should allow role assignment when all dependencies are met', async () => {
      mockDependencyResolver.resolvePermissionWithDependencies.mockResolvedValue({
        granted: true,
        missingDependencies: [],
        resolutionPath: ['users:view']
      });

      mockRbacService.getUserPermissions.mockResolvedValue([
        { id: '1', tenant_id: 'tenant1', name: 'View Users', resource: 'users', action: 'view', created_at: '2023-01-01' }
      ]);

      const result = await validationService.preValidateRoleAssignment(
        'manager-user-id',
        'user-role-id',
        'target-user-id',
        'tenant1'
      );

      expect(result.canProceed).toBe(true);
      expect(result.blockingIssues).toEqual([]);
    });

    test('should block role assignment when dependencies are missing', async () => {
      mockDependencyResolver.resolvePermissionWithDependencies.mockResolvedValue({
        granted: false,
        missingDependencies: ['users:manage'],
        resolutionPath: []
      });

      mockRbacService.getUserPermissions.mockResolvedValue([]);

      const result = await validationService.preValidateRoleAssignment(
        'limited-user-id',
        'admin-role-id',
        'target-user-id',
        'tenant1'
      );

      expect(result.canProceed).toBe(false);
      expect(result.blockingIssues).toContain('Missing required permissions: users:manage');
    });
  });
});
