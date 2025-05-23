
import { EnhancedMigration, MigrationDependencyValidationResult } from './types';

export class MigrationDependencyChecker {
  /**
   * Validates that all dependencies of the provided migrations exist and have valid versions.
   * @param migrations The migrations to validate
   * @returns Results of the validation
   */
  static async validateDependencies(
    migrations: EnhancedMigration[]
  ): Promise<MigrationDependencyValidationResult> {
    const errors: string[] = [];
    const migrationVersions = new Set(migrations.map(m => m.version));
    
    // Check each migration's dependencies
    for (const migration of migrations) {
      if (!migration.dependencies || migration.dependencies.length === 0) {
        continue;
      }
      
      // Check that each dependency exists in the provided migrations
      for (const dependency of migration.dependencies) {
        if (!migrationVersions.has(dependency)) {
          errors.push(`Migration ${migration.version} depends on ${dependency} which does not exist.`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      migration: migrations.length === 1 ? migrations[0].version : 'multiple',
      errors
    };
  }
  
  /**
   * Sorts migrations based on their dependencies to create a valid execution order.
   * Uses topological sort to resolve dependency graph.
   * 
   * @param migrations Migrations to sort
   * @returns Sorted migrations in execution order
   */
  static sortByDependencies(migrations: EnhancedMigration[]): EnhancedMigration[] {
    // Build dependency graph
    const graph = new Map<string, string[]>();
    const allVersions = new Set<string>();
    
    for (const migration of migrations) {
      allVersions.add(migration.version);
      
      if (!graph.has(migration.version)) {
        graph.set(migration.version, []);
      }
      
      if (migration.dependencies && migration.dependencies.length > 0) {
        for (const dependency of migration.dependencies) {
          // Add edge from dependency to migration (dependency must come before migration)
          if (!graph.has(dependency)) {
            graph.set(dependency, []);
          }
          graph.get(dependency)!.push(migration.version);
        }
      }
    }
    
    // Perform topological sort
    const visited = new Set<string>();
    const sortedVersions: string[] = [];
    const temporaryMarks = new Set<string>();
    
    function visit(version: string) {
      // Detect cycles
      if (temporaryMarks.has(version)) {
        throw new Error(`Circular dependency detected: ${version}`);
      }
      
      // Skip if already visited
      if (visited.has(version)) {
        return;
      }
      
      temporaryMarks.add(version);
      
      // Visit dependencies first
      for (const dependent of graph.get(version) || []) {
        visit(dependent);
      }
      
      temporaryMarks.delete(version);
      visited.add(version);
      sortedVersions.push(version);
    }
    
    // Visit all versions
    for (const version of allVersions) {
      if (!visited.has(version)) {
        visit(version);
      }
    }
    
    // Map sorted versions back to migration objects
    const versionToMigration = new Map(migrations.map(m => [m.version, m]));
    return sortedVersions.map(version => versionToMigration.get(version)!)
      .filter(Boolean);
  }
  
  /**
   * Builds a dependency graph representation of migrations.
   * 
   * @param migrations Migrations to analyze
   * @returns A graph representation for visualization or analysis
   */
  static buildDependencyGraph(migrations: EnhancedMigration[]): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    for (const migration of migrations) {
      if (!graph[migration.version]) {
        graph[migration.version] = [];
      }
      
      if (migration.dependencies && migration.dependencies.length > 0) {
        graph[migration.version] = [...migration.dependencies];
      }
    }
    
    return graph;
  }
  
  /**
   * Detects potential circular dependencies in a set of migrations.
   * 
   * @param migrations Migrations to analyze
   * @returns Array of detected circular dependencies
   */
  static detectCircularDependencies(migrations: EnhancedMigration[]): string[][] {
    const circularDependencies: string[][] = [];
    const graph = this.buildDependencyGraph(migrations);
    
    // Helper function to detect cycles
    function detectCycle(version: string, visited: Set<string>, path: string[]) {
      if (visited.has(version)) {
        // Found a cycle
        const cycleStart = path.indexOf(version);
        if (cycleStart !== -1) {
          circularDependencies.push(path.slice(cycleStart));
        }
        return;
      }
      
      visited.add(version);
      path.push(version);
      
      for (const dependency of graph[version] || []) {
        detectCycle(dependency, new Set(visited), [...path]);
      }
    }
    
    // Check each migration for cycles
    for (const migration of migrations) {
      detectCycle(migration.version, new Set(), []);
    }
    
    return circularDependencies;
  }
}
