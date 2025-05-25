
import { rbacService } from '../rbacService';

describe('Enhanced RBAC Component Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle permission check with caching', async () => {
    const startTime = performance.now();
    
    // First call - should hit the service
    const result1 = await rbacService.checkPermission(
      'test-user',
      'read',
      'documents',
      { tenantId: 'test-tenant' }
    );
    
    // Second call - should hit cache
    const result2 = await rbacService.checkPermission(
      'test-user',
      'read',
      'documents',
      { tenantId: 'test-tenant' }
    );
    
    const endTime = performance.now();
    
    expect(result1).toBe(result2);
    expect(endTime - startTime).toBeLessThan(100); // Should be fast with caching
  });

  test('should handle cache invalidation on permission change', async () => {
    // Check initial permission
    await rbacService.checkPermission(
      'test-user',
      'write',
      'documents',
      { tenantId: 'test-tenant' }
    );

    // Invalidate cache
    rbacService.invalidateUserPermissions('test-user', 'Permission updated');

    // Check again - should fetch fresh data
    const result = await rbacService.checkPermission(
      'test-user',
      'write',
      'documents',
      { tenantId: 'test-tenant' }
    );

    expect(typeof result).toBe('boolean');
  });

  test('should handle bulk permission checks efficiently', async () => {
    const startTime = performance.now();
    
    const permissions = ['read', 'write', 'delete'];
    const results = await Promise.all(
      permissions.map(action => 
        rbacService.checkPermission(
          'test-user',
          action,
          'documents',
          { tenantId: 'test-tenant' }
        )
      )
    );
    
    const endTime = performance.now();
    
    expect(results).toHaveLength(3);
    expect(endTime - startTime).toBeLessThan(200); // Bulk operations should be efficient
  });

  test('should get user roles correctly', async () => {
    const roles = await rbacService.getUserRoles('test-user', 'test-tenant');
    expect(Array.isArray(roles)).toBe(true);
  });

  test('should handle monitoring lifecycle', () => {
    // Start monitoring
    rbacService.startMonitoring();
    
    // Warm cache
    rbacService.warmUpCache('standard');
    
    // Get roles
    rbacService.getUserRoles('test-user', 'test-tenant');
    
    // Get recommendations
    const recommendations = rbacService.generateRecommendations();
    expect(recommendations).toHaveProperty('recommendations');
    
    // Stop monitoring
    rbacService.stopMonitoring();
  });
});
