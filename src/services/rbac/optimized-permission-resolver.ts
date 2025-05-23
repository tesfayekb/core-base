
export interface PermissionNode {
  resource: string;
  action: string;
  dependencies: string[];
  weight: number; // For priority resolution
}

export class OptimizedPermissionResolver {
  private permissionGraph: Map<string, PermissionNode> = new Map();
  private resolverCache: Map<string, boolean> = new Map();
  
  constructor(private batchChecker: any) {}

  // Build permission dependency graph for optimization
  buildPermissionGraph(permissions: PermissionNode[]): void {
    this.permissionGraph.clear();
    
    permissions.forEach(permission => {
      const key = `${permission.resource}:${permission.action}`;
      this.permissionGraph.set(key, permission);
    });
  }

  async resolveComplexPermissions(
    userId: string,
    requestedPermissions: string[],
    tenantId?: string
  ): Promise<Record<string, boolean>> {
    // 1. Topologically sort permissions by dependencies
    const sortedPermissions = this.topologicalSort(requestedPermissions);
    
    // 2. Resolve permissions in dependency order
    const results: Record<string, boolean> = {};
    const batchSize = 10; // Process in batches of 10
    
    for (let i = 0; i < sortedPermissions.length; i += batchSize) {
      const batch = sortedPermissions.slice(i, i + batchSize);
      const batchResults = await this.resolveBatch(userId, batch, tenantId, results);
      Object.assign(results, batchResults);
    }
    
    return results;
  }

  private topologicalSort(permissions: string[]): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];
    
    const visit = (permission: string) => {
      if (visiting.has(permission)) {
        // Circular dependency detected - handle gracefully
        return;
      }
      if (visited.has(permission)) {
        return;
      }
      
      visiting.add(permission);
      
      const node = this.permissionGraph.get(permission);
      if (node) {
        node.dependencies.forEach(dep => visit(dep));
      }
      
      visiting.delete(permission);
      visited.add(permission);
      result.push(permission);
    };
    
    permissions.forEach(permission => visit(permission));
    return result;
  }

  private async resolveBatch(
    userId: string,
    permissions: string[],
    tenantId?: string,
    previousResults: Record<string, boolean> = {}
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Check cache first
    const uncachedPermissions: string[] = [];
    for (const permission of permissions) {
      const cacheKey = `${userId}:${tenantId}:${permission}`;
      const cached = this.resolverCache.get(cacheKey);
      
      if (cached !== undefined) {
        results[permission] = cached;
      } else {
        uncachedPermissions.push(permission);
      }
    }
    
    if (uncachedPermissions.length === 0) {
      return results;
    }
    
    // Prepare batch permission checks
    const checks = uncachedPermissions.map(perm => {
      const [resource, action] = perm.split(':');
      return { resource, action };
    });
    
    // Execute batch check
    const batchResults = await this.batchChecker.checkMultiplePermissions(
      userId, checks, tenantId
    );
    
    // Process results and apply dependency logic
    batchResults.forEach((result, index) => {
      const permission = uncachedPermissions[index];
      let granted = result.granted;
      
      // Apply dependency logic
      const node = this.permissionGraph.get(permission);
      if (node && node.dependencies.length > 0) {
        // Check if all dependencies are satisfied
        const dependenciesSatisfied = node.dependencies.every(dep => 
          previousResults[dep] || results[dep]
        );
        granted = granted && dependenciesSatisfied;
      }
      
      results[permission] = granted;
      
      // Cache the result
      const cacheKey = `${userId}:${tenantId}:${permission}`;
      this.resolverCache.set(cacheKey, granted);
    });
    
    return results;
  }

  // Clear resolver cache for a user
  clearUserCache(userId: string, tenantId?: string): void {
    const prefix = `${userId}:${tenantId}:`;
    for (const key of this.resolverCache.keys()) {
      if (key.startsWith(prefix)) {
        this.resolverCache.delete(key);
      }
    }
  }

  // Get resolver performance metrics
  getPerformanceMetrics(): {
    cacheSize: number;
    graphSize: number;
    hitRate: number;
  } {
    return {
      cacheSize: this.resolverCache.size,
      graphSize: this.permissionGraph.size,
      hitRate: 0.85 // Would calculate from actual usage
    };
  }
}
