
export interface EnhancedMigration {
  version: string;
  description: string;
  up: string; // SQL to migrate up
  down: string; // SQL to migrate down
  dependencies?: string[]; // Optional list of migration versions this migration depends on
  performanceImpact?: 'low' | 'medium' | 'high'; // Optional indicator of expected performance impact
  securityBoundary?: boolean; // Indicates if this migration affects security boundaries
}

export interface MigrationExecutionOptions {
  validateDependencies?: boolean; // Whether to validate dependencies before execution
  assessPerformance?: boolean; // Whether to assess performance impact before execution
  generateRollbackTests?: boolean; // Whether to generate rollback tests
}

export interface MigrationExecutionResult {
  success: boolean;
  version: string;
  executionTime: number; // in milliseconds
  message: string;
  error?: string;
  performanceImpact?: any;
  rollbackTest?: any;
}

export interface MigrationDependencyValidationResult {
  valid: boolean;
  migration: string;
  errors: string[];
}

export interface MigrationPerformanceAssessment {
  migration: string;
  impact: 'low' | 'medium' | 'high';
  affectedTables: string[];
  estimatedDuration: number; // in milliseconds
  recommendations?: string[];
}

export interface MigrationRollbackTest {
  migration: string;
  testCases: MigrationRollbackTestCase[];
  valid: boolean;
}

export interface MigrationRollbackTestCase {
  description: string;
  upSql: string;
  downSql: string;
  valid: boolean;
  error?: string;
}
