
import { WarmingStrategy, WarmingResult } from '../WarmingTypes';

export class CommonPermissionsStrategy implements WarmingStrategy {
  name = 'common-permissions';
  description = 'Warm cache with commonly used permissions';
  priority = 1;

  async execute(): Promise<WarmingResult> {
    const startTime = performance.now();
    let itemsWarmed = 0;

    try {
      // Simulate warming common permissions
      const commonPermissions = [
        'users:view',
        'users:create',
        'documents:read',
        'documents:write'
      ];

      for (const permission of commonPermissions) {
        // Simulate cache warming
        await new Promise(resolve => setTimeout(resolve, 10));
        itemsWarmed++;
      }

      const duration = performance.now() - startTime;

      return {
        strategy: this.name,
        success: true,
        errors: [],
        duration,
        itemsWarmed
      };
    } catch (error) {
      return {
        strategy: this.name,
        success: false,
        errors: [error.message],
        duration: performance.now() - startTime,
        itemsWarmed
      };
    }
  }
}
