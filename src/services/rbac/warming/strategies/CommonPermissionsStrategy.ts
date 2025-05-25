
// Common Permissions Warming Strategy
import { WarmingStrategy, WarmingResult } from '../WarmingTypes';
import { enhancedPermissionResolver } from '../../EnhancedPermissionResolver';

export class CommonPermissionsStrategy implements WarmingStrategy {
  name = 'common_permissions';
  description = 'Warm common permission patterns for active users';
  priority = 1;

  private readonly COMMON_PERMISSIONS = [
    { action: 'view', resource: 'users' },
    { action: 'view', resource: 'documents' },
    { action: 'view', resource: 'settings' },
    { action: 'create', resource: 'documents' },
    { action: 'update', resource: 'documents' }
  ];

  async execute(): Promise<WarmingResult> {
    const startTime = Date.now();
    const activeUserIds = await this.getActiveUserIds();
    let itemsWarmed = 0;
    const errors: string[] = [];

    for (const userId of activeUserIds) {
      for (const permission of this.COMMON_PERMISSIONS) {
        try {
          await enhancedPermissionResolver.resolvePermission(
            userId,
            permission.action,
            permission.resource
          );
          itemsWarmed++;
        } catch (error) {
          errors.push(`Failed to warm ${permission.action}:${permission.resource} for user ${userId}`);
        }
      }
    }

    return {
      strategy: this.name,
      itemsWarmed,
      duration: Date.now() - startTime,
      success: errors.length === 0,
      errors
    };
  }

  private async getActiveUserIds(): Promise<string[]> {
    return ['user1', 'user2', 'user3', 'admin1', 'manager1'];
  }
}
