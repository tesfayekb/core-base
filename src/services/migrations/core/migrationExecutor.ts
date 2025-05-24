
// Migration Executor with Enhanced Security
// Version: 2.0.0
// Phase 1.2: Database Foundation - Enhanced Security Migration Execution

import { Migration, SQLExecutor } from '../types/migrationTypes';
import { MigrationValidator } from './migrationValidator';

export class MigrationExecutor {
  constructor(
    private executeSQL: SQLExecutor,
    private validator: MigrationValidator
  ) {}

  async initialize(): Promise<void> {
    console.log('🔧 Initializing migration system...');
    
    // Check if migration table exists
    const tableExists = await this.executeSQL(`
      SELECT migration_table_exists() as exists;
    `);
    
    if (!tableExists.rows[0]?.exists) {
      console.log('📋 Creating migrations table...');
      await this.executeSQL(`
        CREATE TABLE IF NOT EXISTS migrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          version VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          applied_by VARCHAR(255),
          execution_time_ms INTEGER,
          success BOOLEAN DEFAULT TRUE,
          error_message TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_migrations_version ON migrations(version);
        CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations(applied_at);
      `);
    }
  }

  async runMigrations(migrations: Migration[], appliedBy?: string): Promise<void> {
    console.log(`🚀 Running ${migrations.length} migrations...`);
    
    for (const migration of migrations) {
      await this.runMigration(migration, appliedBy);
    }
    
    console.log('✅ All migrations completed successfully');
  }

  async runMigration(migration: Migration, appliedBy?: string): Promise<void> {
    const startTime = Date.now();
    
    // Check if migration is already applied
    const isApplied = await this.validator.isMigrationApplied(migration.version);
    if (isApplied) {
      console.log(`⏭️ Migration ${migration.version} already applied, skipping`);
      return;
    }

    console.log(`🔄 Applying migration ${migration.version}: ${migration.name}`);
    
    try {
      // Use enhanced security migration function
      const result = await this.executeSQL(`
        SELECT execute_migration_sql(
          '${migration.version}',
          $migration$${migration.script}$migration$,
          '${migration.checksum || ''}'
        ) as result;
      `);

      if (!result.rows[0]?.result?.success) {
        throw new Error(`Migration execution failed: ${result.rows[0]?.result?.message || 'Unknown error'}`);
      }

      const executionTime = Date.now() - startTime;
      
      // Record successful migration
      await this.executeSQL(`
        INSERT INTO migrations (version, name, checksum, applied_by, execution_time_ms)
        VALUES ('${migration.version}', '${migration.name}', '${migration.checksum || ''}', '${appliedBy || 'system'}', ${executionTime});
      `);
      
      console.log(`✅ Migration ${migration.version} applied successfully (${executionTime}ms)`);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Record failed migration
      await this.executeSQL(`
        INSERT INTO migrations (version, name, checksum, applied_by, execution_time_ms, success, error_message)
        VALUES ('${migration.version}', '${migration.name}', '${migration.checksum || ''}', '${appliedBy || 'system'}', ${executionTime}, FALSE, '${errorMessage.replace(/'/g, "''")}');
      `);
      
      console.error(`❌ Migration ${migration.version} failed: ${errorMessage}`);
      throw error;
    }
  }
}
