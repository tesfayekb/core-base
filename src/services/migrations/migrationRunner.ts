// Main Migration Runner - Orchestrates all migration operations
// Version: 1.1.0
// Phase 1.2: Database Foundation - Real Supabase Integration

import { Migration, MigrationStatus, SQLExecutor } from './types/migrationTypes';
import { MigrationValidator } from './core/migrationValidator';
import { MigrationExecutor } from './core/migrationExecutor';
import { MigrationStatusTracker } from './core/migrationStatusTracker';
import { supabase } from '../database';

export class MigrationRunner {
  private migrations: Migration[] = [];
  private validator: MigrationValidator;
  private executor: MigrationExecutor;
  private statusTracker: MigrationStatusTracker;

  constructor(executeSQL?: SQLExecutor) {
    const sqlExecutor = executeSQL || this.createSupabaseExecutor();
    this.validator = new MigrationValidator(sqlExecutor);
    this.executor = new MigrationExecutor(sqlExecutor, this.validator);
    this.statusTracker = new MigrationStatusTracker(this.validator);
  }

  /**
   * Create Supabase SQL executor
   */
  private createSupabaseExecutor(): SQLExecutor {
    return async (sql: string): Promise<any> => {
      try {
        console.log('🔄 Executing SQL via Supabase:', sql.substring(0, 100) + '...');
        
        // Use Supabase RPC for raw SQL execution
        const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
        
        if (error) {
          console.error('❌ SQL execution error:', error);
          throw new Error(`SQL execution failed: ${error.message}`);
        }
        
        console.log('✅ SQL executed successfully');
        return { rows: data || [], rowCount: Array.isArray(data) ? data.length : 0 };
      } catch (error) {
        console.error('❌ Supabase SQL execution failed:', error);
        throw error;
      }
    };
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('information_schema.tables').select('table_name').limit(1);
      if (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
      }
      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
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

// Export singleton instance with real Supabase connection
export const migrationRunner = new MigrationRunner();

// Re-export types and interfaces
export type { Migration, MigrationRecord, MigrationStatus } from './types/migrationTypes';
