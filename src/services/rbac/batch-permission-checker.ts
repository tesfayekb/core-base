
export interface PermissionCheck {
  resource: string;
  action: string;
  resourceId?: string;
}

export interface BatchPermissionResult {
  granted: boolean;
  resource: string;
  action: string;
  resourceId?: string;
  cached: boolean;
  checkTime: number;
}

export class BatchPermissionChecker {
  constructor(
    private cacheService: any,
    private permissionService: any
  ) {}

  async checkMultiplePermissions(
    userId: string,
    checks: PermissionCheck[],
    tenantId?: string
  ): Promise<BatchPermissionResult[]> {
    const startTime = Date.now();
    
    // 1. Group checks by cache availability
    const { cachedChecks, uncachedChecks } = await this.partitionByCacheAvailability(
      userId, checks, tenantId
    );
    
    // 2. Process cached results immediately
    const cachedResults = cachedChecks.map(check => ({
      ...check,
      granted: check.cached_result,
      cached: true,
      checkTime: 0
    }));
    
    // 3. Batch process uncached checks
    const uncachedResults = await this.batchProcessUncachedChecks(
      userId, uncachedChecks, tenantId
    );
    
    // 4. Combine and return results
    const allResults = [...cachedResults, ...uncachedResults];
    
    console.log(`Batch permission check completed for ${checks.length} permissions in ${Date.now() - startTime}ms`);
    
    return allResults;
  }

  private async partitionByCacheAvailability(
    userId: string,
    checks: PermissionCheck[],
    tenantId?: string
  ): Promise<{
    cachedChecks: (PermissionCheck & { cached_result: boolean })[];
    uncachedChecks: PermissionCheck[];
  }> {
    const cachedChecks: (PermissionCheck & { cached_result: boolean })[] = [];
    const uncachedChecks: PermissionCheck[] = [];
    
    // Build cache keys for all checks
    const cacheKeys = checks.map(check => 
      this.buildCacheKey(userId, check, tenantId)
    );
    
    // Batch get from cache
    const cachedValues = await this.cacheService.getMany(cacheKeys);
    
    // Partition based on cache availability
    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      const cachedValue = cachedValues[i];
      
      if (cachedValue !== undefined) {
        cachedChecks.push({
          ...check,
          cached_result: cachedValue === 'true'
        });
      } else {
        uncachedChecks.push(check);
      }
    }
    
    return { cachedChecks, uncachedChecks };
  }

  private async batchProcessUncachedChecks(
    userId: string,
    checks: PermissionCheck[],
    tenantId?: string
  ): Promise<BatchPermissionResult[]> {
    if (checks.length === 0) {
      return [];
    }
    
    const checkStartTime = Date.now();
    
    // 1. Get user roles once for all checks
    const userRoles = await this.permissionService.getUserRoles(userId, tenantId);
    
    // 2. Get all role permissions in one query
    const rolePermissions = await this.permissionService.getRolePermissionsBatch(
      userRoles.map(role => role.id)
    );
    
    // 3. Create permission lookup map
    const permissionMap = new Map<string, boolean>();
    rolePermissions.forEach(permission => {
      const key = `${permission.resource}:${permission.action}`;
      permissionMap.set(key, true);
    });
    
    // 4. Check all permissions against the map
    const results: BatchPermissionResult[] = [];
    const cacheEntries: Record<string, string> = {};
    
    for (const check of checks) {
      const permissionKey = `${check.resource}:${check.action}`;
      const granted = permissionMap.has(permissionKey);
      
      results.push({
        ...check,
        granted,
        cached: false,
        checkTime: Date.now() - checkStartTime
      });
      
      // Prepare cache entry
      const cacheKey = this.buildCacheKey(userId, check, tenantId);
      cacheEntries[cacheKey] = granted.toString();
    }
    
    // 5. Batch update cache
    await this.cacheService.setMany(cacheEntries, 300); // 5 minute TTL
    
    return results;
  }

  private buildCacheKey(
    userId: string,
    check: PermissionCheck,
    tenantId?: string
  ): string {
    const tenant = tenantId || 'global';
    const resource = check.resourceId ? `${check.resource}:${check.resourceId}` : check.resource;
    return `rbac:batch:${userId}:${tenant}:${resource}:${check.action}`;
  }

  // Optimized permission checking for UI components
  async checkUIPermissions(
    userId: string,
    permissions: string[], // Format: "resource:action"
    tenantId?: string
  ): Promise<Record<string, boolean>> {
    const checks: PermissionCheck[] = permissions.map(perm => {
      const [resource, action] = perm.split(':');
      return { resource, action };
    });
    
    const results = await this.checkMultiplePermissions(userId, checks, tenantId);
    
    const permissionMap: Record<string, boolean> = {};
    results.forEach((result, index) => {
      permissionMap[permissions[index]] = result.granted;
    });
    
    return permissionMap;
  }
}
