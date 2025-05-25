
// Core Permission Resolution Logic
import { PermissionResolutionResult, PermissionContext } from './PermissionTypes';
import { PermissionValidator } from '../PermissionValidator';
import { PermissionCache } from '../PermissionCache';

export class CoreResolver {
  constructor(
    private validator: PermissionValidator,
    private cache: PermissionCache
  ) {}

  async resolveBasicPermission(
    userId: string,
    action: string,
    resource: string,
    context: PermissionContext
  ): Promise<PermissionResolutionResult> {
    const startTime = performance.now();

    try {
      if (await this.validator.isSuperAdmin(userId)) {
        return {
          granted: true,
          reason: 'SuperAdmin bypass',
          dependencies: [],
          resolutionTime: performance.now() - startTime,
          cacheHit: false
        };
      }

      const hasPermission = await this.validator.hasDirectPermission(
        userId,
        action,
        resource,
        context
      );

      return {
        granted: hasPermission,
        reason: hasPermission ? 'Direct permission granted' : 'Permission denied',
        dependencies: [],
        resolutionTime: performance.now() - startTime,
        cacheHit: false
      };
    } catch (error) {
      return {
        granted: false,
        reason: `Resolution error: ${error}`,
        dependencies: [],
        resolutionTime: performance.now() - startTime,
        cacheHit: false
      };
    }
  }
}
