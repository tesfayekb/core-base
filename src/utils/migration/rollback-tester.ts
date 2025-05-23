
import { MigrationRollbackTest, MigrationRollbackTestCase } from './types';

export class MigrationRollbackTester {
  /**
   * Generates rollback tests for a migration's up/down scripts.
   * 
   * @param upSql The SQL for migrating up
   * @param version The migration version
   * @returns Rollback test results
   */
  static async generateRollbackTests(upSql: string, version: string): Promise<MigrationRollbackTest> {
    const testCases: MigrationRollbackTestCase[] = [];
    
    // Analyze the up SQL to extract schema changes
    const schemaChanges = this.analyzeSchemaChanges(upSql);
    
    // Generate test cases for each schema change type
    for (const change of schemaChanges) {
      let testCase: MigrationRollbackTestCase;
      
      switch (change.type) {
        case 'CREATE_TABLE':
          testCase = this.generateTableRollbackTest(change);
          break;
        case 'ALTER_TABLE':
          testCase = this.generateAlterRollbackTest(change);
          break;
        case 'DROP_TABLE':
          testCase = this.generateDropRollbackTest(change);
          break;
        case 'INSERT':
          testCase = this.generateDataRollbackTest(change);
          break;
        default:
          testCase = this.generateGenericRollbackTest(change);
      }
      
      testCases.push(testCase);
    }
    
    // Default test case if no specific tests could be generated
    if (testCases.length === 0) {
      testCases.push({
        description: 'Generic rollback test',
        upSql,
        downSql: '-- No specific rollback test could be generated',
        valid: false,
        error: 'Unable to generate specific rollback test'
      });
    }
    
    return {
      migration: version,
      testCases,
      valid: testCases.every(tc => tc.valid)
    };
  }
  
  /**
   * Analyzes SQL to extract schema changes.
   * 
   * @param sql The SQL to analyze
   * @returns Array of schema changes
   */
  private static analyzeSchemaChanges(sql: string): Array<{
    type: string;
    table?: string;
    sql: string;
    details?: any;
  }> {
    const changes: Array<{type: string; table?: string; sql: string; details?: any}> = [];
    const lines = sql.split(';').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      // Simple regex-based analysis - in production this would be more robust
      if (/CREATE\s+TABLE/i.test(line)) {
        const match = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?/i);
        if (match) {
          changes.push({
            type: 'CREATE_TABLE',
            table: match[1],
            sql: line,
            details: { tableName: match[1] }
          });
        }
      } else if (/ALTER\s+TABLE/i.test(line)) {
        const match = line.match(/ALTER\s+TABLE\s+["`]?(\w+)["`]?/i);
        if (match) {
          changes.push({
            type: 'ALTER_TABLE',
            table: match[1],
            sql: line,
            details: { tableName: match[1] }
          });
        }
      } else if (/DROP\s+TABLE/i.test(line)) {
        const match = line.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["`]?(\w+)["`]?/i);
        if (match) {
          changes.push({
            type: 'DROP_TABLE',
            table: match[1],
            sql: line,
            details: { tableName: match[1] }
          });
        }
      } else if (/INSERT\s+INTO/i.test(line)) {
        const match = line.match(/INSERT\s+INTO\s+["`]?(\w+)["`]?/i);
        if (match) {
          changes.push({
            type: 'INSERT',
            table: match[1],
            sql: line,
            details: { tableName: match[1] }
          });
        }
      } else {
        changes.push({
          type: 'GENERIC',
          sql: line
        });
      }
    }
    
    return changes;
  }
  
  /**
   * Generates a table creation rollback test.
   * 
   * @param change The schema change
   * @returns Rollback test case
   */
  private static generateTableRollbackTest(change: any): MigrationRollbackTestCase {
    return {
      description: `Test rollback for table creation: ${change.table}`,
      upSql: change.sql,
      downSql: `DROP TABLE IF EXISTS ${change.table}`,
      valid: true
    };
  }
  
  /**
   * Generates an alter table rollback test.
   * 
   * @param change The schema change
   * @returns Rollback test case
   */
  private static generateAlterRollbackTest(change: any): MigrationRollbackTestCase {
    // This is simplified - in reality, would need to analyze the specific ALTER operation
    return {
      description: `Test rollback for table alteration: ${change.table}`,
      upSql: change.sql,
      downSql: `-- Rollback for ALTER TABLE ${change.table} would need careful review\n-- Original change: ${change.sql}`,
      valid: false,
      error: 'ALTER TABLE rollback requires manual verification'
    };
  }
  
  /**
   * Generates a drop table rollback test.
   * 
   * @param change The schema change
   * @returns Rollback test case
   */
  private static generateDropRollbackTest(change: any): MigrationRollbackTestCase {
    return {
      description: `Test rollback for table drop: ${change.table}`,
      upSql: change.sql,
      downSql: `-- Cannot automatically generate CREATE TABLE statement for ${change.table}\n-- Original change: ${change.sql}`,
      valid: false,
      error: 'DROP TABLE rollback requires original table definition'
    };
  }
  
  /**
   * Generates a data modification rollback test.
   * 
   * @param change The schema change
   * @returns Rollback test case
   */
  private static generateDataRollbackTest(change: any): MigrationRollbackTestCase {
    return {
      description: `Test rollback for data insertion: ${change.table}`,
      upSql: change.sql,
      downSql: `-- Rollback for INSERT INTO ${change.table} would require DELETE with matching criteria\n-- Original change: ${change.sql}`,
      valid: false,
      error: 'Data modifications require manual rollback'
    };
  }
  
  /**
   * Generates a generic rollback test.
   * 
   * @param change The schema change
   * @returns Rollback test case
   */
  private static generateGenericRollbackTest(change: any): MigrationRollbackTestCase {
    return {
      description: 'Generic rollback test case',
      upSql: change.sql,
      downSql: `-- Unable to automatically generate rollback for: ${change.sql}`,
      valid: false,
      error: 'Cannot automatically generate rollback for this SQL'
    };
  }
  
  /**
   * Validates a rollback by executing it in a transaction and rolling back.
   * Note: This would require database access and is left as a placeholder.
   * 
   * @param upSql The up migration SQL
   * @param downSql The down migration SQL
   * @param executeSQL Function to execute SQL
   * @returns Validation result
   */
  static async validateRollback(
    upSql: string, 
    downSql: string, 
    executeSQL: (sql: string) => Promise<any>
  ): Promise<{valid: boolean; error?: string}> {
    try {
      // Begin transaction
      await executeSQL('BEGIN');
      
      // Execute up SQL
      await executeSQL(upSql);
      
      // Execute down SQL
      await executeSQL(downSql);
      
      // Rollback transaction
      await executeSQL('ROLLBACK');
      
      return { valid: true };
    } catch (error) {
      // Ensure transaction is rolled back
      try {
        await executeSQL('ROLLBACK');
      } catch (rollbackError) {
        // Ignore rollback errors
      }
      
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error during rollback validation' 
      };
    }
  }
}
