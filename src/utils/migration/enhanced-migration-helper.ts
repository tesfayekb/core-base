
import { EnhancedMigration, MigrationExecutionOptions, MigrationExecutionResult } from './types';
import { MigrationDependencyChecker } from './dependency-checker';
import { MigrationRollbackTester } from './rollback-tester';
import { MigrationPerformanceAssessor } from './performance-assessor';

export class EnhancedMigrationHelper {
  static async createExecutionPlan(
    migrations: EnhancedMigration[],
    getTableMetrics: (tableName: string) => Promise<any>,
    executeSQL: (sql: string) => Promise<any>
  ): Promise<{
    validations: any[];
    performanceAssessments: any[];
    rollbackTests: any[];
    executionOrder: EnhancedMigration[];
  }> {
    // 1. Validate dependencies
    const validations = await Promise.all(
      migrations.map(migration => 
        MigrationDependencyChecker.validateDependencies([migration])
      )
    );
    
    // 2. Assess performance impact
    const performanceAssessments = await Promise.all(
      migrations.map(migration =>
        MigrationPerformanceAssessor.assessMigrationPerformance(
          migration.up,
          getTableMetrics
        )
      )
    );
    
    // 3. Generate rollback tests
    const rollbackTests = await Promise.all(
      migrations.map(migration =>
        MigrationRollbackTester.generateRollbackTests(migration.up, migration.version)
      )
    );
    
    // 4. Determine execution order
    const executionOrder = MigrationDependencyChecker.sortByDependencies(migrations);
    
    return {
      validations,
      performanceAssessments,
      rollbackTests,
      executionOrder
    };
  }
  
  static async executeMigrationSafely(
    migration: EnhancedMigration,
    executeSQL: (sql: string) => Promise<any>,
    options: MigrationExecutionOptions = {}
  ): Promise<MigrationExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 1. Pre-execution checks
      if (options.validateDependencies !== false) {
        const validation = MigrationDependencyChecker.validateDependencies([migration]);
        if (!validation.valid) {
          throw new Error(`Dependency validation failed: ${validation.errors.join(', ')}`);
        }
      }
      
      // 2. Execute migration
      console.log(`Executing migration ${migration.version}: ${migration.description}`);
      await executeSQL(migration.up);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        version: migration.version,
        executionTime,
        message: `Migration ${migration.version} executed successfully`
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        version: migration.version,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Migration ${migration.version} failed`
      };
    }
  }
}
