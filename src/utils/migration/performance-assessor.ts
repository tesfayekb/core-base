
import { MigrationPerformanceAssessment } from './types';

export class MigrationPerformanceAssessor {
  /**
   * Assesses the potential performance impact of a migration.
   * 
   * @param sql The SQL to assess
   * @param getTableMetrics Function to get table metrics (size, row count, etc.)
   * @returns Performance assessment
   */
  static async assessMigrationPerformance(
    sql: string, 
    getTableMetrics: (tableName: string) => Promise<any>
  ): Promise<MigrationPerformanceAssessment> {
    // Extract affected tables from SQL
    const affectedTables = this.extractAffectedTables(sql);
    
    // Get metrics for affected tables
    const tableMetrics = await Promise.all(
      affectedTables.map(async table => {
        try {
          return {
            name: table,
            metrics: await getTableMetrics(table)
          };
        } catch (error) {
          return {
            name: table,
            metrics: null, // Table might not exist yet
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    // Analyze SQL for performance impacts
    const operationImpact = this.analyzeOperationImpact(sql);
    
    // Determine overall performance impact
    let impact: 'low' | 'medium' | 'high' = 'low';
    const recommendations: string[] = [];
    
    // Assess based on table size and operation type
    const largeTableOperations = tableMetrics.filter(
      table => table.metrics && (
        table.metrics.rowCount > 1000000 ||
        table.metrics.sizeBytes > 1000000000 // 1GB
      )
    );
    
    const indexOperations = operationImpact.createIndex || operationImpact.dropIndex;
    const schemaChangeOnLargeTables = largeTableOperations.length > 0 && 
      (operationImpact.alterTable || operationImpact.addColumn || operationImpact.dropColumn);
    
    if (operationImpact.fullTableScan || schemaChangeOnLargeTables) {
      impact = 'high';
      recommendations.push('Consider batching or off-peak execution for this migration');
    } else if (largeTableOperations.length > 0 || indexOperations) {
      impact = 'medium';
      if (indexOperations) {
        recommendations.push('Adding/removing indexes may temporarily block write operations');
      }
    }
    
    // Add specific recommendations based on operation types
    if (operationImpact.alterTable) {
      recommendations.push('ALTER TABLE operations may lock the table');
    }
    
    if (operationImpact.createIndex) {
      recommendations.push('Consider creating indexes concurrently to reduce blocking');
    }
    
    if (operationImpact.fullTableScan && largeTableOperations.length > 0) {
      recommendations.push('Full table scan on large tables may cause performance issues');
    }
    
    // Estimate duration based on table size and operation complexity
    let estimatedDuration = 1000; // Base 1 second
    
    for (const table of tableMetrics) {
      if (table.metrics) {
        // Add time proportional to table size
        if (table.metrics.rowCount) {
          estimatedDuration += Math.log10(table.metrics.rowCount + 1) * 1000;
        }
        if (table.metrics.sizeBytes) {
          estimatedDuration += Math.log10(table.metrics.sizeBytes + 1) * 500;
        }
      }
    }
    
    // Multiply by operation complexity
    if (operationImpact.alterTable) estimatedDuration *= 2;
    if (operationImpact.createIndex) estimatedDuration *= 3;
    if (operationImpact.fullTableScan) estimatedDuration *= 4;
    
    return {
      migration: 'unknown', // This will be set by the caller
      impact,
      affectedTables,
      estimatedDuration,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }
  
  /**
   * Extracts affected table names from SQL.
   * 
   * @param sql The SQL to analyze
   * @returns Array of table names
   */
  private static extractAffectedTables(sql: string): string[] {
    const tables = new Set<string>();
    
    // Basic regex patterns to extract table names
    const patterns = [
      /\bFROM\s+["`]?(\w+)["`]?/gi,
      /\bJOIN\s+["`]?(\w+)["`]?/gi,
      /\bINTO\s+["`]?(\w+)["`]?/gi,
      /\bUPDATE\s+["`]?(\w+)["`]?/gi,
      /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?/gi,
      /\bALTER\s+TABLE\s+["`]?(\w+)["`]?/gi,
      /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["`]?(\w+)["`]?/gi,
      /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\w+)\s+ON\s+["`]?(\w+)["`]?/gi,
      /\bDROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(?:\w+)\s+ON\s+["`]?(\w+)["`]?/gi
    ];
    
    // Extract table names using patterns
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        if (match[1]) {
          tables.add(match[1]);
        }
      }
    }
    
    return [...tables];
  }
  
  /**
   * Analyzes SQL to determine operation impact types.
   * 
   * @param sql The SQL to analyze
   * @returns Impact analysis
   */
  private static analyzeOperationImpact(sql: string): {
    alterTable: boolean;
    addColumn: boolean;
    dropColumn: boolean;
    createIndex: boolean;
    dropIndex: boolean;
    fullTableUpdate: boolean;
    fullTableScan: boolean;
  } {
    const sqlLower = sql.toLowerCase();
    
    return {
      alterTable: /alter\s+table/i.test(sqlLower),
      addColumn: /add\s+column/i.test(sqlLower),
      dropColumn: /drop\s+column/i.test(sqlLower),
      createIndex: /create\s+(?:unique\s+)?index/i.test(sqlLower),
      dropIndex: /drop\s+index/i.test(sqlLower),
      fullTableUpdate: /update\s+\w+\s+set/i.test(sqlLower) && !/where/i.test(sqlLower),
      fullTableScan: /select\s+/i.test(sqlLower) && !/where/i.test(sqlLower) || /select\s+.*\swhere\s+.*\s(?:not\s+)?like\s+['"'"]%/i.test(sqlLower)
    };
  }
  
  /**
   * Analyzes complex query patterns for potential performance issues.
   * 
   * @param sql The SQL to analyze
   * @returns Array of potential performance issues
   */
  static analyzeQueryComplexity(sql: string): string[] {
    const issues: string[] = [];
    const sqlLower = sql.toLowerCase();
    
    // Check for cartesian joins (missing join conditions)
    if (/\bjoin\b/i.test(sqlLower) && !/\bon\b/i.test(sqlLower)) {
      issues.push('Potential cartesian join detected (JOIN without ON clause)');
    }
    
    // Check for SELECT * (retrieving unnecessary columns)
    if (/select\s+\*/i.test(sqlLower)) {
      issues.push('SELECT * may retrieve unnecessary columns');
    }
    
    // Check for LIKE with leading wildcard
    if (/\blike\s+['"']%/i.test(sqlLower)) {
      issues.push('LIKE with leading wildcard prevents index usage');
    }
    
    // Check for complex subqueries
    const subqueryMatches = sqlLower.match(/\(select/gi);
    if (subqueryMatches && subqueryMatches.length > 2) {
      issues.push(`Complex query with ${subqueryMatches.length} subqueries may affect performance`);
    }
    
    // Check for NOT IN with subquery
    if (/not\s+in\s+\(\s*select/i.test(sqlLower)) {
      issues.push('NOT IN with subquery can cause performance issues');
    }
    
    // Check for ORDER BY on non-indexed columns (simplified check)
    if (/order\s+by\s+\w+\s+desc/i.test(sqlLower)) {
      issues.push('ORDER BY DESC may require additional sorting operations');
    }
    
    return issues;
  }
  
  /**
   * Analyzes a data migration for volume issues.
   * 
   * @param sql The SQL to analyze
   * @returns Assessment of data migration volume
   */
  static analyzeDataMigrationVolume(sql: string): {
    hasDataMigration: boolean;
    estimatedRows?: number;
    recommendations?: string[];
  } {
    const result = {
      hasDataMigration: false,
      estimatedRows: undefined as number | undefined,
      recommendations: [] as string[]
    };
    
    if (/insert\s+into\s+\w+\s+(?:select|values)/i.test(sql)) {
      result.hasDataMigration = true;
      
      // Try to estimate rows from VALUES clauses
      const valuesClauses = sql.match(/values\s*\([^)]*\)/gi);
      if (valuesClauses) {
        result.estimatedRows = valuesClauses.length;
      }
      
      // Check for INSERT INTO SELECT without LIMIT
      if (/insert\s+into\s+\w+\s+select/i.test(sql) && !/limit/i.test(sql)) {
        result.recommendations.push('Consider adding LIMIT to large data migrations');
      }
      
      // Check for lack of batching in large inserts
      if (result.estimatedRows && result.estimatedRows > 1000) {
        result.recommendations.push('Consider batching large INSERT operations');
      }
    }
    
    return result;
  }
}
