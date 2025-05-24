
// Main Migration Runner - Orchestrates all migration operations
// Version: 1.0.0
// Phase 1.2: Database Foundation

import { Migration, MigrationStatus, SQLExecutor } from './types/migrationTypes';
import { MigrationValidator } from './core/migrationValidator';
import { MigrationExecutor } from './core/migrationExecutor';
import { MigrationStatusTracker } from './core/migrationStatusTracker';

export class MigrationRunner {
  private migrations: Migration[] = [];
  private validator: MigrationValidator;
  private executor: MigrationExecutor;
  private statusTracker: MigrationStatusTracker;

  constructor(executeSQL: SQLExecutor) {
    this.validator = new MigrationValidator(executeSQL);
    this.executor = new MigrationExecutor(executeSQL, this.validator);
    this.statusTracker = new MigrationStatusTracker(this.validator);
  }

  /**
   * Register a migration for execution
   */
  addMigration(migration: Migration): void {
    this.migrations.push(migration);
  }

  /**
   * Initialize the migration system
   */
  async initialize(): Promise<void> {
    return this.executor.initialize();
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(appliedBy?: string): Promise<void> {
    return this.executor.runMigrations(this.migrations, appliedBy);
  }

  /**
   * Execute a single migration
   */
  async runMigration(migration: Migration, appliedBy?: string): Promise<void> {
    return this.executor.runMigration(migration, appliedBy);
  }

  /**
   * Validate migration integrity
   */
  async validateMigrations(): Promise<boolean> {
    return this.validator.validateMigrations(this.migrations);
  }

  /**
   * Get migration status summary
   */
  async getStatus(): Promise<MigrationStatus> {
    return this.statusTracker.getStatus(this.migrations);
  }

  /**
   * Check if a migration has been applied
   */
  async isMigrationApplied(version: string): Promise<boolean> {
    return this.validator.isMigrationApplied(version);
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations() {
    return this.validator.getAppliedMigrations();
  }
}

// Create a default mock execution function for development
const mockExecuteSQL = async (sql: string): Promise<any> => {
  console.log('📊 Mock SQL execution:', sql.substring(0, 100) + '...');
  return { rows: [], rowCount: 0 };
};

// Export singleton instance
export const migrationRunner = new MigrationRunner(mockExecuteSQL);

// Re-export types and interfaces
export type { Migration, MigrationRecord, MigrationStatus } from './types/migrationTypes';
