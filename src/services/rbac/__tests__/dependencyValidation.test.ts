
import { DependencyValidationService } from '../DependencyValidationService';

describe('DependencyValidationService', () => {
  let dependencyValidationService: DependencyValidationService;

  beforeEach(() => {
    dependencyValidationService = DependencyValidationService.getInstance();
  });

  describe('validatePermissionDependencies', () => {
    test('should validate simple permission dependencies', async () => {
      const permissions = [
        { action: 'read', resource: 'documents' },
        { action: 'write', resource: 'documents' }
      ];

      const result = await dependencyValidationService.validatePermissionAssignment(
        'test-user',
        'read:documents',
        'test-tenant'
      );

      expect(result.valid).toBe(true);
    });

    test('should detect missing dependencies', async () => {
      const result = await dependencyValidationService.validatePermissionAssignment(
        'test-user',
        'delete:documents',
        'test-tenant'
      );

      expect(result.valid).toBe(false);
      expect(result.missingDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('validateRoleConsistency', () => {
    test('should validate role consistency across tenant', async () => {
      const result = await dependencyValidationService.validateRoleAssignment(
        'admin-user',
        'editor-role',
        'target-user',
        'test-tenant'
      );

      expect(result.valid).toBe(true);
    });

    test('should detect role inconsistencies', async () => {
      const result = await dependencyValidationService.validateRoleAssignment(
        'regular-user',
        'admin-role',
        'target-user',
        'test-tenant'
      );

      expect(result.valid).toBe(false);
      expect(result.missingDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('validateCrossTenantIsolation', () => {
    test('should validate tenant isolation', async () => {
      const result = await dependencyValidationService.preValidateRoleAssignment(
        'user-1',
        'role-1',
        'target-user',
        'tenant-1'
      );

      expect(result.canProceed).toBe(true);
    });
  });
});
