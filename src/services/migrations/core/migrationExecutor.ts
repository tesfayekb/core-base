
// Migration Execution Engine
// Version: 1.0.0
// Phase 1.2: Database Foundation

import { Migration, SQLExecutor } from '../types/migrationTypes';
import { MigrationValidator } from './migrationValidator';

export class MigrationExecutor {
  private executeSQL: SQLExecutor;
  private validator: MigrationValidator;

  constructor(executeSQL: SQLExecutor, validator: MigrationValidator) {
    this.executeSQL = executeSQL;
    this.validator = validator;
  }

  /**
   * Initialize the migration system by creating the migrations table
   */
  async initialize(): Promise<void> {
    const createMigrationsTableSQL = `
      -- Create migrations tracking table if it doesn't exist
      CREATE TABLE IF NOT EXISTS migrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version VARCHAR NOT NULL UNIQUE,
        name VARCHAR NOT NULL,
        script TEXT NOT NULL,
        hash VARCHAR NOT NULL,
        applied_by VARCHAR,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_migrations_version ON migrations(version);
    `;

    try {
      await this.executeSQL(createMigrationsTableSQL);
      console.log('✅ Migration system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize migration system:', error);
      throw error;
    }
  }

  /**
   * Execute a single migration
   */
  async runMigration(migration: Migration, appliedBy?: string): Promise<void> {
    const hash = this.validator.generateHash(migration.script);

    console.log(`🔄 Executing migration ${migration.version}: ${migration.name}`);

    try {
      // Execute the migration script
      await this.executeSQL(migration.script);

      // Record the migration as applied
      const recordMigrationSQL = `
        INSERT INTO migrations (version, name, script, hash, applied_by)
        VALUES ('${migration.version}', '${migration.name}', $SCRIPT$${migration.script}$SCRIPT$, '${hash}', ${appliedBy ? `'${appliedBy}'` : 'NULL'});
      `;

      await this.executeSQL(recordMigrationSQL);

      console.log(`✅ Migration ${migration.version} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(migrations: Migration[], appliedBy?: string): Promise<void> {
    console.log('🚀 Starting migration process...');

    try {
      // Sort migrations by version
      const sortedMigrations = [...migrations].sort((a, b) => a.version.localeCompare(b.version));

      for (const migration of sortedMigrations) {
        const isApplied = await this.validator.isMigrationApplied(migration.version);
        
        if (!isApplied) {
          await this.runMigration(migration, appliedBy);
        } else {
          console.log(`⏭️ Migration ${migration.version} already applied, skipping`);
        }
      }

      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }
}
