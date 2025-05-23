
/**
 * Migration Performance Impact Assessment
 * Analyzes and predicts performance impact of large migrations
 */

export interface PerformanceAssessment {
  estimatedDuration: number; // in milliseconds
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedTables: string[];
  lockingConcerns: LockingConcern[];
  recommendations: string[];
  resourceRequirements: ResourceRequirements;
  rollbackComplexity: 'simple' | 'moderate' | 'complex';
}

export interface LockingConcern {
  operation: string;
  lockType: 'shared' | 'exclusive' | 'access_exclusive';
  duration: 'brief' | 'moderate' | 'extended';
  impact: string;
}

export interface ResourceRequirements {
  estimatedCPU: 'low' | 'medium' | 'high';
  estimatedMemory: 'low' | 'medium' | 'high';
  estimatedIO: 'low' | 'medium' | 'high';
  temporaryDiskSpace: number; // in MB
}

export interface TableMetrics {
  tableName: string;
  rowCount: number;
  sizeInMB: number;
  indexCount: number;
  hasConstraints: boolean;
}

export class MigrationPerformanceAssessor {
  /**
   * Analyzes migration SQL and provides performance impact assessment
   */
  static async assessMigrationPerformance(
    migrationSQL: string,
    getTableMetrics: (tableName: string) => Promise<TableMetrics>
  ): Promise<PerformanceAssessment> {
    const operations = this.parseMigrationOperations(migrationSQL);
    const affectedTables = this.extractAffectedTables(migrationSQL);
    
    // Gather metrics for affected tables
    const tableMetrics = await Promise.all(
      affectedTables.map(async (tableName) => {
        try {
          return await getTableMetrics(tableName);
        } catch (error) {
          // Table might not exist yet (CREATE operations)
          return {
            tableName,
            rowCount: 0,
            sizeInMB: 0,
            indexCount: 0,
            hasConstraints: false
          };
        }
      })
    );
    
    // Analyze each operation type
    let estimatedDuration = 0;
    const lockingConcerns: LockingConcern[] = [];
    const recommendations: string[] = [];
    let maxImpactLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    for (const operation of operations) {
      const assessment = this.assessOperation(operation, tableMetrics);
      estimatedDuration += assessment.duration;
      lockingConcerns.push(...assessment.lockingConcerns);
      recommendations.push(...assessment.recommendations);
      
      if (this.getImpactWeight(assessment.impactLevel) > this.getImpactWeight(maxImpactLevel)) {
        maxImpactLevel = assessment.impactLevel;
      }
    }
    
    const resourceRequirements = this.calculateResourceRequirements(operations, tableMetrics);
    const rollbackComplexity = this.assessRollbackComplexity(operations);
    
    // Add general recommendations based on impact level
    if (maxImpactLevel === 'high' || maxImpactLevel === 'critical') {
      recommendations.push('Consider running during maintenance window');
      recommendations.push('Monitor database performance during execution');
      recommendations.push('Ensure adequate backup before execution');
    }
    
    if (estimatedDuration > 60000) { // > 1 minute
      recommendations.push('Consider breaking into smaller migrations');
      recommendations.push('Implement progress monitoring');
    }
    
    return {
      estimatedDuration,
      impactLevel: maxImpactLevel,
      affectedTables,
      lockingConcerns,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      resourceRequirements,
      rollbackComplexity
    };
  }
  
  /**
   * Parses migration SQL to identify operation types
   */
  private static parseMigrationOperations(sql: string): Array<{
    type: string;
    details: string;
    table?: string;
  }> {
    const operations = [];
    const lines = sql.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      if (upperLine.startsWith('CREATE TABLE')) {
        const match = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
        operations.push({
          type: 'CREATE_TABLE',
          details: line,
          table: match ? match[1] : undefined
        });
      } else if (upperLine.startsWith('ALTER TABLE')) {
        const match = line.match(/ALTER\s+TABLE\s+(\w+)/i);
        operations.push({
          type: 'ALTER_TABLE',
          details: line,
          table: match ? match[1] : undefined
        });
      } else if (upperLine.startsWith('CREATE INDEX')) {
        operations.push({
          type: 'CREATE_INDEX',
          details: line
        });
      } else if (upperLine.startsWith('DROP')) {
        operations.push({
          type: 'DROP',
          details: line
        });
      } else if (upperLine.startsWith('INSERT') || upperLine.startsWith('UPDATE')) {
        operations.push({
          type: 'DATA_MODIFICATION',
          details: line
        });
      }
    }
    
    return operations;
  }
  
  /**
   * Assesses performance impact of a specific operation
   */
  private static assessOperation(
    operation: { type: string; details: string; table?: string },
    tableMetrics: TableMetrics[]
  ): {
    duration: number;
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
    lockingConcerns: LockingConcern[];
    recommendations: string[];
  } {
    const table = operation.table ? tableMetrics.find(t => t.tableName === operation.table) : null;
    const recommendations: string[] = [];
    let duration = 100; // Base duration in ms
    let impactLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const lockingConcerns: LockingConcern[] = [];
    
    switch (operation.type) {
      case 'CREATE_TABLE':
        duration = 500;
        impactLevel = 'low';
        lockingConcerns.push({
          operation: 'CREATE TABLE',
          lockType: 'access_exclusive',
          duration: 'brief',
          impact: 'No blocking on existing tables'
        });
        break;
        
      case 'ALTER_TABLE':
        if (table) {
          duration = Math.max(1000, table.rowCount * 0.01); // ~0.01ms per row
          if (table.rowCount > 1000000) {
            impactLevel = 'high';
            recommendations.push('Consider using pg_repack or similar tools for large table alterations');
          } else if (table.rowCount > 100000) {
            impactLevel = 'medium';
          }
        }
        
        lockingConcerns.push({
          operation: 'ALTER TABLE',
          lockType: 'access_exclusive',
          duration: table && table.rowCount > 100000 ? 'extended' : 'moderate',
          impact: 'Blocks all access to table during operation'
        });
        break;
        
      case 'CREATE_INDEX':
        if (table) {
          duration = Math.max(2000, table.rowCount * 0.1); // ~0.1ms per row for index creation
          if (table.rowCount > 1000000) {
            impactLevel = 'high';
            recommendations.push('Use CREATE INDEX CONCURRENTLY for large tables');
          } else if (table.rowCount > 100000) {
            impactLevel = 'medium';
          }
        }
        
        if (operation.details.toUpperCase().includes('CONCURRENTLY')) {
          lockingConcerns.push({
            operation: 'CREATE INDEX CONCURRENTLY',
            lockType: 'shared',
            duration: 'extended',
            impact: 'Allows reads and writes but may impact performance'
          });
        } else {
          lockingConcerns.push({
            operation: 'CREATE INDEX',
            lockType: 'shared',
            duration: 'moderate',
            impact: 'Blocks writes during creation'
          });
        }
        break;
        
      case 'DROP':
        duration = 200;
        impactLevel = 'medium';
        lockingConcerns.push({
          operation: 'DROP',
          lockType: 'access_exclusive',
          duration: 'brief',
          impact: 'Brief exclusive lock to drop object'
        });
        recommendations.push('Ensure no dependencies exist before dropping');
        break;
        
      case 'DATA_MODIFICATION':
        if (table) {
          duration = Math.max(500, table.rowCount * 0.05); // ~0.05ms per row for data operations
          if (table.rowCount > 500000) {
            impactLevel = 'critical';
            recommendations.push('Consider batching large data modifications');
          } else if (table.rowCount > 100000) {
            impactLevel = 'high';
          }
        }
        break;
    }
    
    return {
      duration,
      impactLevel,
      lockingConcerns,
      recommendations
    };
  }
  
  /**
   * Extracts table names affected by the migration
   */
  private static extractAffectedTables(sql: string): string[] {
    const tableRegex = /(?:CREATE|ALTER|DROP)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(\w+)/gi;
    const tables = new Set<string>();
    let match;
    
    while ((match = tableRegex.exec(sql)) !== null) {
      tables.add(match[1]);
    }
    
    return Array.from(tables);
  }
  
  /**
   * Calculates resource requirements based on operations and table metrics
   */
  private static calculateResourceRequirements(
    operations: Array<{ type: string; details: string; table?: string }>,
    tableMetrics: TableMetrics[]
  ): ResourceRequirements {
    let estimatedCPU: 'low' | 'medium' | 'high' = 'low';
    let estimatedMemory: 'low' | 'medium' | 'high' = 'low';
    let estimatedIO: 'low' | 'medium' | 'high' = 'low';
    let temporaryDiskSpace = 0;
    
    const totalTableSize = tableMetrics.reduce((sum, table) => sum + table.sizeInMB, 0);
    const maxTableSize = Math.max(...tableMetrics.map(t => t.sizeInMB), 0);
    
    // Assess based on operation types and table sizes
    if (operations.some(op => op.type === 'CREATE_INDEX') && maxTableSize > 1000) {
      estimatedCPU = 'high';
      estimatedMemory = 'high';
      estimatedIO = 'high';
      temporaryDiskSpace += maxTableSize * 0.3; // Index creation needs ~30% of table size
    }
    
    if (operations.some(op => op.type === 'ALTER_TABLE') && totalTableSize > 500) {
      estimatedCPU = estimatedCPU === 'high' ? 'high' : 'medium';
      estimatedMemory = estimatedMemory === 'high' ? 'high' : 'medium';
      estimatedIO = estimatedIO === 'high' ? 'high' : 'medium';
      temporaryDiskSpace += totalTableSize * 0.5; // Table alterations may need temporary space
    }
    
    if (operations.some(op => op.type === 'DATA_MODIFICATION') && totalTableSize > 100) {
      estimatedIO = 'high';
      temporaryDiskSpace += totalTableSize * 0.2; // Data modifications need transaction log space
    }
    
    return {
      estimatedCPU,
      estimatedMemory,
      estimatedIO,
      temporaryDiskSpace: Math.round(temporaryDiskSpace)
    };
  }
  
  /**
   * Assesses rollback complexity based on operations
   */
  private static assessRollbackComplexity(
    operations: Array<{ type: string; details: string; table?: string }>
  ): 'simple' | 'moderate' | 'complex' {
    const hasDataModification = operations.some(op => op.type === 'DATA_MODIFICATION');
    const hasComplexAlterations = operations.some(op => 
      op.type === 'ALTER_TABLE' && 
      (op.details.toUpperCase().includes('DROP COLUMN') || op.details.toUpperCase().includes('ALTER COLUMN'))
    );
    const hasDropOperations = operations.some(op => op.type === 'DROP');
    
    if (hasDataModification && (hasComplexAlterations || hasDropOperations)) {
      return 'complex';
    } else if (hasDataModification || hasComplexAlterations || hasDropOperations) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }
  
  private static getImpactWeight(level: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (level) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'critical': return 4;
      default: return 0;
    }
  }
}
