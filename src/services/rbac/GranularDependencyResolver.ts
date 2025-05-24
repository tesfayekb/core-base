
// Granular Permission Dependency Resolver
// Enhanced dependency resolution with complex dependency chains

export interface PermissionDependency {
  requiredPermission: string;
  resource: string;
  action: string;
  condition?: 'AND' | 'OR';
  priority: number;
}

export interface DependencyChain {
  permission: string;
  dependencies: PermissionDependency[];
  circularDependencies: string[];
  resolutionOrder: string[];
}

export class GranularDependencyResolver {
  private static instance: GranularDependencyResolver;
  private dependencyGraph = new Map<string, PermissionDependency[]>();
  private resolutionCache = new Map<string, boolean>();
  private circularDetection = new Set<string>();

  static getInstance(): GranularDependencyResolver {
    if (!GranularDependencyResolver.instance) {
      GranularDependencyResolver.instance = new GranularDependencyResolver();
    }
    return GranularDependencyResolver.instance;
  }

  private constructor() {
    this.initializeStandardDependencies();
  }

  private initializeStandardDependencies(): void {
    // Users management dependencies
    this.addDependency('users:update', [
      { requiredPermission: 'users:view', resource: 'users', action: 'view', priority: 1 }
    ]);
    
    this.addDependency('users:delete', [
      { requiredPermission: 'users:view', resource: 'users', action: 'view', priority: 1 },
      { requiredPermission: 'users:update', resource: 'users', action: 'update', priority: 2 }
    ]);

    // Roles management dependencies
    this.addDependency('roles:assign', [
      { requiredPermission: 'roles:view', resource: 'roles', action: 'view', priority: 1 },
      { requiredPermission: 'users:view', resource: 'users', action: 'view', priority: 1 }
    ]);

    // Complex permission management dependencies
    this.addDependency('permissions:manage', [
      { requiredPermission: 'permissions:view', resource: 'permissions', action: 'view', priority: 1 },
      { requiredPermission: 'roles:view', resource: 'roles', action: 'view', priority: 2 },
      { requiredPermission: 'users:view', resource: 'users', action: 'view', priority: 3 }
    ]);
  }

  addDependency(permission: string, dependencies: PermissionDependency[]): void {
    this.dependencyGraph.set(permission, dependencies);
    this.clearResolutionCache();
  }

  async resolvePermissionWithDependencies(
    userId: string,
    permission: string,
    hasPermissionFn: (userId: string, perm: string) => Promise<boolean>
  ): Promise<{ granted: boolean; missingDependencies: string[]; resolutionPath: string[] }> {
    const resolutionPath: string[] = [];
    const missingDependencies: string[] = [];
    
    // Check for circular dependencies
    if (this.circularDetection.has(permission)) {
      return { granted: false, missingDependencies: ['CIRCULAR_DEPENDENCY'], resolutionPath };
    }

    this.circularDetection.add(permission);
    
    try {
      // Check direct permission first
      const hasDirectPermission = await hasPermissionFn(userId, permission);
      resolutionPath.push(permission);
      
      if (hasDirectPermission) {
        this.circularDetection.delete(permission);
        return { granted: true, missingDependencies: [], resolutionPath };
      }

      // Check dependencies
      const dependencies = this.dependencyGraph.get(permission);
      if (!dependencies || dependencies.length === 0) {
        this.circularDetection.delete(permission);
        return { granted: false, missingDependencies: [permission], resolutionPath };
      }

      // Sort dependencies by priority
      const sortedDependencies = [...dependencies].sort((a, b) => a.priority - b.priority);
      
      let allDependenciesMet = true;
      for (const dep of sortedDependencies) {
        const depResult = await this.resolvePermissionWithDependencies(
          userId,
          dep.requiredPermission,
          hasPermissionFn
        );
        
        resolutionPath.push(...depResult.resolutionPath);
        
        if (!depResult.granted) {
          allDependenciesMet = false;
          missingDependencies.push(...depResult.missingDependencies);
          
          // For OR conditions, continue checking other dependencies
          if (dep.condition !== 'OR') {
            break;
          }
        } else if (dep.condition === 'OR') {
          // For OR conditions, if one is met, we can stop
          allDependenciesMet = true;
          break;
        }
      }

      this.circularDetection.delete(permission);
      return { 
        granted: allDependenciesMet, 
        missingDependencies: allDependenciesMet ? [] : missingDependencies,
        resolutionPath 
      };
      
    } catch (error) {
      this.circularDetection.delete(permission);
      throw error;
    }
  }

  getDependencyChain(permission: string): DependencyChain {
    const dependencies = this.dependencyGraph.get(permission) || [];
    const circularDependencies: string[] = [];
    const resolutionOrder: string[] = [];
    
    // Build resolution order based on priorities
    const sortedDependencies = [...dependencies].sort((a, b) => a.priority - b.priority);
    resolutionOrder.push(...sortedDependencies.map(d => d.requiredPermission));
    
    return {
      permission,
      dependencies,
      circularDependencies,
      resolutionOrder
    };
  }

  private clearResolutionCache(): void {
    this.resolutionCache.clear();
  }

  getMetrics(): {
    totalDependencies: number;
    averageDependencyDepth: number;
    cacheSize: number;
  } {
    const totalDependencies = Array.from(this.dependencyGraph.values())
      .reduce((sum, deps) => sum + deps.length, 0);
    
    const averageDependencyDepth = this.dependencyGraph.size > 0 
      ? totalDependencies / this.dependencyGraph.size 
      : 0;

    return {
      totalDependencies,
      averageDependencyDepth,
      cacheSize: this.resolutionCache.size
    };
  }
}

export const granularDependencyResolver = GranularDependencyResolver.getInstance();
