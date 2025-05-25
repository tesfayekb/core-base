
import { CacheWarmupStrategy, CacheWarmupResult } from './CacheWarmupStrategy';
import { rbacService } from '../../rbac/rbacService';

export class OptimizedUserPermissionsStrategy implements CacheWarmupStrategy {
  name = 'optimized-user-permissions';

  async execute(): Promise<CacheWarmupResult> {
    const startTime = performance.now();
    let itemsWarmed = 0;

    try {
      // Get most active users for targeted warming
      const activeUsers = await this.getActiveUsers();
      
      // Warm permissions in batches for better performance
      const batchSize = 5;
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          try {
            // Warm common permission checks
            const commonPermissions = [
              { action: 'read', resource: 'documents' },
              { action: 'write', resource: 'documents' },
              { action: 'read', resource: 'users' },
              { action: 'manage', resource: 'settings' }
            ];

            for (const perm of commonPermissions) {
              await rbacService.checkPermission(
                user.id,
                perm.action,
                perm.resource,
                { tenantId: user.tenantId }
              );
              itemsWarmed++;
            }
          } catch (error) {
            console.warn(`Failed to warm permissions for user ${user.id}:`, error);
          }
        }));
      }

      const duration = performance.now() - startTime;

      return {
        strategyName: this.name,
        success: true,
        message: `Warmed ${itemsWarmed} permission entries for ${activeUsers.length} users`,
        duration,
        itemsWarmed
      };

    } catch (error) {
      return {
        strategyName: this.name,
        success: false,
        message: `Failed to warm user permissions: ${error.message}`,
        duration: performance.now() - startTime,
        itemsWarmed
      };
    }
  }

  private async getActiveUsers(): Promise<Array<{id: string, tenantId: string}>> {
    // Mock implementation - in production, this would query recent user activity
    return [
      { id: 'user-1', tenantId: 'tenant-1' },
      { id: 'user-2', tenantId: 'tenant-1' },
      { id: 'user-3', tenantId: 'tenant-2' },
      { id: 'user-4', tenantId: 'tenant-2' },
      { id: 'user-5', tenantId: 'tenant-3' }
    ];
  }
}
