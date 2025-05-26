
// Integration tests for user cache service performance
import { UserCacheService } from '../UserCacheService';

describe('UserCacheService Integration', () => {
  let cacheService: UserCacheService;

  beforeEach(() => {
    cacheService = UserCacheService.getInstance();
    cacheService.clearAll();
  });

  describe('Performance Tests', () => {
    test('should cache and retrieve users efficiently', () => {
      const startTime = performance.now();
      
      // Cache 100 users
      for (let i = 0; i < 100; i++) {
        cacheService.setCachedUser(`user-${i}`, {
          id: `user-${i}`,
          email: `user${i}@example.com`,
          name: `User ${i}`
        });
      }
      
      // Retrieve all users
      const retrievedUsers = [];
      for (let i = 0; i < 100; i++) {
        const user = cacheService.getCachedUser(`user-${i}`);
        if (user) retrievedUsers.push(user);
      }
      
      const totalTime = performance.now() - startTime;
      
      expect(retrievedUsers).toHaveLength(100);
      expect(totalTime).toBeLessThan(50); // Should complete in under 50ms
    });

    test('should handle cache eviction properly', () => {
      // Fill cache beyond capacity (assuming max 1000)
      for (let i = 0; i < 1200; i++) {
        cacheService.setCachedUser(`user-${i}`, { id: `user-${i}` });
      }
      
      const stats = cacheService.getCacheStats();
      expect(stats.users.size).toBeLessThanOrEqual(1000);
      
      // Oldest entries should be evicted
      expect(cacheService.getCachedUser('user-0')).toBeUndefined();
      expect(cacheService.getCachedUser('user-1199')).toBeDefined();
    });

    test('should provide accurate cache statistics', () => {
      // Add some test data
      cacheService.setCachedUser('user-1', { id: 'user-1' });
      cacheService.setCachedRoles('tenant-1', [{ id: 'role-1' }]);
      cacheService.setCachedQuery('query-1', { data: 'test' });
      
      const stats = cacheService.getCacheStats();
      
      expect(stats.users.size).toBe(1);
      expect(stats.roles.size).toBe(1);
      expect(stats.queries.size).toBe(1);
    });
  });

  describe('Batch Operations', () => {
    test('should handle batch user caching efficiently', () => {
      const users = Array.from({ length: 50 }, (_, i) => ({
        id: `user-${i}`,
        data: { id: `user-${i}`, email: `user${i}@example.com` }
      }));
      
      const startTime = performance.now();
      cacheService.setCachedUsers(users);
      const cacheTime = performance.now() - startTime;
      
      const retrieveStartTime = performance.now();
      const userIds = users.map(u => u.id);
      const retrieved = cacheService.getCachedUsers(userIds);
      const retrieveTime = performance.now() - retrieveStartTime;
      
      expect(retrieved.size).toBe(50);
      expect(cacheTime).toBeLessThan(20);
      expect(retrieveTime).toBeLessThan(10);
    });
  });
});
