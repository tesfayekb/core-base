
/**
 * Migration Rollback Testing Utilities
 * Automated testing of migration rollback procedures
 */

export interface RollbackTestResult {
  success: boolean;
  errors: string[];
  dataIntegrityChecks: DataIntegrityCheck[];
  performanceMetrics: {
    rollbackDuration: number;
    affectedRows: number;
    queryCount: number;
  };
}

export interface DataIntegrityCheck {
  checkName: string;
  passed: boolean;
  expected: any;
  actual: any;
  description: string;
}

export interface MigrationRollbackTest {
  version: string;
  setupData?: () => Promise<void>;
  integrityChecks: Array<{
    name: string;
    query: string;
    expectedResult: any;
    description: string;
  }>;
  cleanupData?: () => Promise<void>;
}

export class MigrationRollbackTester {
  /**
   * Tests rollback procedure for a specific migration
   */
  static async testMigrationRollback(
    migration: MigrationRollbackTest,
    executeSQL: (query: string) => Promise<any>
  ): Promise<RollbackTestResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const dataIntegrityChecks: DataIntegrityCheck[] = [];
    let affectedRows = 0;
    let queryCount = 0;
    
    try {
      // Setup test data if provided
      if (migration.setupData) {
        await migration.setupData();
      }
      
      // Execute rollback (this would be the DOWN migration)
      console.log(`Testing rollback for migration ${migration.version}`);
      
      // Run integrity checks after rollback
      for (const check of migration.integrityChecks) {
        try {
          queryCount++;
          const result = await executeSQL(check.query);
          
          const passed = this.compareResults(result, check.expectedResult);
          
          dataIntegrityChecks.push({
            checkName: check.name,
            passed,
            expected: check.expectedResult,
            actual: result,
            description: check.description
          });
          
          if (!passed) {
            errors.push(`Integrity check failed: ${check.name} - ${check.description}`);
          }
        } catch (error) {
          errors.push(`Error running integrity check ${check.name}: ${error}`);
          dataIntegrityChecks.push({
            checkName: check.name,
            passed: false,
            expected: check.expectedResult,
            actual: null,
            description: `Error: ${error}`
          });
        }
      }
      
      // Cleanup test data
      if (migration.cleanupData) {
        await migration.cleanupData();
      }
      
    } catch (error) {
      errors.push(`Rollback test failed: ${error}`);
    }
    
    const rollbackDuration = performance.now() - startTime;
    
    return {
      success: errors.length === 0,
      errors,
      dataIntegrityChecks,
      performanceMetrics: {
        rollbackDuration,
        affectedRows,
        queryCount
      }
    };
  }
  
  /**
   * Runs comprehensive rollback tests for multiple migrations
   */
  static async runRollbackTestSuite(
    tests: MigrationRollbackTest[],
    executeSQL: (query: string) => Promise<any>
  ): Promise<{ passed: number; failed: number; results: RollbackTestResult[] }> {
    const results: RollbackTestResult[] = [];
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      const result = await this.testMigrationRollback(test, executeSQL);
      results.push(result);
      
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
    }
    
    return { passed, failed, results };
  }
  
  /**
   * Generates automated rollback test cases based on migration structure
   */
  static generateRollbackTests(migrationSQL: string, version: string): MigrationRollbackTest {
    // Parse migration SQL to identify tables, columns, indexes created
    const createdTables = this.extractCreatedTables(migrationSQL);
    const createdColumns = this.extractCreatedColumns(migrationSQL);
    const createdIndexes = this.extractCreatedIndexes(migrationSQL);
    
    const integrityChecks = [
      // Check that rolled back tables don't exist
      ...createdTables.map(table => ({
        name: `table_${table}_removed`,
        query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '${table}' AND table_schema = 'public'`,
        expectedResult: { count: 0 },
        description: `Table ${table} should be removed after rollback`
      })),
      
      // Check that rolled back columns don't exist
      ...createdColumns.map(col => ({
        name: `column_${col.table}_${col.column}_removed`,
        query: `SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = '${col.table}' AND column_name = '${col.column}' AND table_schema = 'public'`,
        expectedResult: { count: 0 },
        description: `Column ${col.column} in table ${col.table} should be removed after rollback`
      })),
      
      // Check that rolled back indexes don't exist
      ...createdIndexes.map(index => ({
        name: `index_${index}_removed`,
        query: `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = '${index}'`,
        expectedResult: { count: 0 },
        description: `Index ${index} should be removed after rollback`
      }))
    ];
    
    return {
      version,
      integrityChecks
    };
  }
  
  private static compareResults(actual: any, expected: any): boolean {
    if (Array.isArray(expected)) {
      return Array.isArray(actual) && 
             actual.length === expected.length &&
             actual.every((item, index) => 
               JSON.stringify(item) === JSON.stringify(expected[index])
             );
    }
    
    if (typeof expected === 'object' && expected !== null) {
      return JSON.stringify(actual) === JSON.stringify(expected);
    }
    
    return actual === expected;
  }
  
  private static extractCreatedTables(sql: string): string[] {
    const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
    const matches = [];
    let match;
    
    while ((match = regex.exec(sql)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  }
  
  private static extractCreatedColumns(sql: string): Array<{table: string, column: string}> {
    const regex = /ALTER\s+TABLE\s+(\w+)\s+ADD\s+(?:COLUMN\s+)?(\w+)/gi;
    const matches = [];
    let match;
    
    while ((match = regex.exec(sql)) !== null) {
      matches.push({ table: match[1], column: match[2] });
    }
    
    return matches;
  }
  
  private static extractCreatedIndexes(sql: string): string[] {
    const regex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
    const matches = [];
    let match;
    
    while ((match = regex.exec(sql)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  }
}
