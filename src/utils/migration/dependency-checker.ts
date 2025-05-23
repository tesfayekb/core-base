
/**
 * Migration Dependency Checker
 * Automatically validates migration dependencies and execution order
 */

export interface MigrationDependency {
  version: string;
  dependsOn: string[];
  breakingChange: boolean;
  estimatedDuration?: number;
  performanceImpact?: 'low' | 'medium' | 'high';
}

export interface DependencyValidationResult {
  valid: boolean;
  errors: string[];
  executionOrder: string[];
  circularDependencies: string[];
  missingDependencies: string[];
}

export class MigrationDependencyChecker {
  /**
   * Validates migration dependencies and determines execution order
   */
  static validateDependencies(migrations: MigrationDependency[]): DependencyValidationResult {
    const errors: string[] = [];
    const circularDependencies: string[] = [];
    const missingDependencies: string[] = [];
    
    // Create lookup map for faster access
    const migrationMap = new Map(migrations.map(m => [m.version, m]));
    
    // Check for missing dependencies
    migrations.forEach(migration => {
      migration.dependsOn.forEach(depVersion => {
        if (!migrationMap.has(depVersion)) {
          missingDependencies.push(`Migration ${migration.version} depends on missing migration ${depVersion}`);
        }
      });
    });
    
    // Check for circular dependencies using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCircularDependency = (version: string): boolean => {
      if (recursionStack.has(version)) {
        circularDependencies.push(version);
        return true;
      }
      
      if (visited.has(version)) {
        return false;
      }
      
      visited.add(version);
      recursionStack.add(version);
      
      const migration = migrationMap.get(version);
      if (migration) {
        for (const dep of migration.dependsOn) {
          if (hasCircularDependency(dep)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(version);
      return false;
    };
    
    // Check each migration for circular dependencies
    migrations.forEach(migration => {
      if (!visited.has(migration.version)) {
        hasCircularDependency(migration.version);
      }
    });
    
    // Generate execution order using topological sort
    const executionOrder = this.generateExecutionOrder(migrations);
    
    const valid = missingDependencies.length === 0 && circularDependencies.length === 0;
    
    return {
      valid,
      errors: [...missingDependencies, ...circularDependencies.map(v => `Circular dependency detected involving ${v}`)],
      executionOrder,
      circularDependencies,
      missingDependencies
    };
  }
  
  /**
   * Generates optimal execution order for migrations using topological sort
   */
  private static generateExecutionOrder(migrations: MigrationDependency[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph and in-degree count
    migrations.forEach(migration => {
      graph.set(migration.version, migration.dependsOn);
      inDegree.set(migration.version, 0);
    });
    
    // Calculate in-degrees
    migrations.forEach(migration => {
      migration.dependsOn.forEach(dep => {
        if (inDegree.has(dep)) {
          inDegree.set(migration.version, (inDegree.get(migration.version) || 0) + 1);
        }
      });
    });
    
    // Kahn's algorithm for topological sorting
    const queue: string[] = [];
    const result: string[] = [];
    
    // Find all nodes with no incoming edges
    inDegree.forEach((degree, version) => {
      if (degree === 0) {
        queue.push(version);
      }
    });
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      // For each dependent migration
      migrations.forEach(migration => {
        if (migration.dependsOn.includes(current)) {
          const newDegree = (inDegree.get(migration.version) || 0) - 1;
          inDegree.set(migration.version, newDegree);
          
          if (newDegree === 0) {
            queue.push(migration.version);
          }
        }
      });
    }
    
    return result;
  }
  
  /**
   * Validates that a specific migration can be safely executed
   */
  static async validateMigrationExecution(
    version: string, 
    appliedMigrations: string[],
    allMigrations: MigrationDependency[]
  ): Promise<{ canExecute: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    const migration = allMigrations.find(m => m.version === version);
    
    if (!migration) {
      return { canExecute: false, reasons: ['Migration not found'] };
    }
    
    // Check if already applied
    if (appliedMigrations.includes(version)) {
      reasons.push('Migration already applied');
    }
    
    // Check dependencies
    for (const dep of migration.dependsOn) {
      if (!appliedMigrations.includes(dep)) {
        reasons.push(`Missing dependency: ${dep}`);
      }
    }
    
    // Check for breaking changes requiring special confirmation
    if (migration.breakingChange) {
      reasons.push('Breaking change requires explicit confirmation');
    }
    
    return {
      canExecute: reasons.length === 0,
      reasons
    };
  }
}
