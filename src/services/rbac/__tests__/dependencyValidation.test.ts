
import { DependencyValidationService } from '../DependencyValidationService';

describe('DependencyValidationService', () => {
  describe('validatePermissionDependencies', () => {
    test('should validate simple permission dependencies', async () => {
      const permissions = [
        { action: 'read', resource: 'documents' },
        { action: 'write', resource: 'documents' }
      ];

      const result = await DependencyValidationService.validatePermissionDependencies(
        permissions,
        'test-tenant'
      );

      expect(result.isValid).toBe(true);
    });

    test('should detect missing dependencies', async () => {
      const permissions = [
        { action: 'delete', resource: 'documents' }
      ];

      const result = await DependencyValidationService.validatePermissionDependencies(
        permissions,
        'test-tenant'
      );

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('validateRoleConsistency', () => {
    test('should validate role consistency across tenant', async () => {
      const permissions = [
        { action: 'read', resource: 'documents' },
        { action: 'write', resource: 'documents' }
      ];

      const result = await DependencyValidationService.validateRoleConsistency(
        permissions,
        'test-tenant'
      );

      expect(result.isConsistent).toBe(true);
    });

    test('should detect role inconsistencies', async () => {
      const permissions = [
        { action: 'admin', resource: 'users' },
        { action: 'limited', resource: 'users' }
      ];

      const result = await DependencyValidationService.validateRoleConsistency(
        permissions,
        'test-tenant'
      );

      expect(result.inconsistencies.length).toBeGreaterThan(0);
    });
  });

  describe('validateCrossTenantIsolation', () => {
    test('should validate tenant isolation', async () => {
      const permission = { action: 'read', resource: 'documents' };

      const result = await DependencyValidationService.validateCrossTenantIsolation(
        permission,
        'tenant-1',
        'tenant-2'
      );

      expect(result.isIsolated).toBe(true);
    });
  });
});
