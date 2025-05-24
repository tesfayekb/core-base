
// Migration System Infrastructure
// Version: 1.0.0
// Phase 1.2: Database Foundation

import { createHash } from 'crypto';

export interface Migration {
  version: string;
  name: string;
  script: string;
}

export interface MigrationRecord {
  id: string;
  version: string;
  name: string;
  script: string;
  hash: string;
  applied_by?: string;
  applied_at: Date;
}

export class MigrationRunner {
  private migrations: Migration[] = [];
  private executeSQL: (sql: string) => Promise<any>;

  constructor(executeSQL: (sql: string) => Promise<any>) {
    this.executeSQL = executeSQL;
  }

  /**
   * Register a migration for execution
   */
  addMigration(migration: Migration): void {
    this.migrations.push(migration);
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
   * Get list of applied migrations
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    const query = `
      SELECT id, version, name, script, hash, applied_by, applied_at
      FROM migrations
      ORDER BY version ASC;
    `;

    try {
      const result = await this.executeSQL(query);
      return result.rows || result || [];
    } catch (error) {
      console.error('❌ Failed to get applied migrations:', error);
      throw error;
    }
  }

  /**
   * Check if a migration has been applied
   */
  async isMigrationApplied(version: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM migrations WHERE version = $1 LIMIT 1;
    `;

    try {
      const result = await this.executeSQL(`SELECT 1 FROM migrations WHERE version = '${version}' LIMIT 1`);
      return (result.rows && result.rows.length > 0) || (Array.isArray(result) && result.length > 0);
    } catch (error) {
      console.error('❌ Failed to check migration status:', error);
      return false;
    }
  }

  /**
   * Generate hash for migration script
   */
  private generateHash(script: string): string {
    return createHash('sha256').update(script).digest('hex');
  }

  /**
   * Execute a single migration
   */
  async runMigration(migration: Migration, appliedBy?: string): Promise<void> {
    const hash = this.generateHash(migration.script);

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
  async runMigrations(appliedBy?: string): Promise<void> {
    console.log('🚀 Starting migration process...');

    try {
      // Sort migrations by version
      const sortedMigrations = [...this.migrations].sort((a, b) => a.version.localeCompare(b.version));

      for (const migration of sortedMigrations) {
        const isApplied = await this.isMigrationApplied(migration.version);
        
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

  /**
   * Validate migration integrity
   */
  async validateMigrations(): Promise<boolean> {
    console.log('🔍 Validating migration integrity...');

    try {
      const appliedMigrations = await this.getAppliedMigrations();
      
      for (const appliedMigration of appliedMigrations) {
        const localMigration = this.migrations.find(m => m.version === appliedMigration.version);
        
        if (!localMigration) {
          console.error(`❌ Applied migration ${appliedMigration.version} not found in local migrations`);
          return false;
        }

        const expectedHash = this.generateHash(localMigration.script);
        if (expectedHash !== appliedMigration.hash) {
          console.error(`❌ Migration ${appliedMigration.version} hash mismatch`);
          return false;
        }
      }

      console.log('✅ Migration integrity validated');
      return true;
    } catch (error) {
      console.error('❌ Migration validation failed:', error);
      return false;
    }
  }

  /**
   * Get migration status summary
   */
  async getStatus(): Promise<{
    totalMigrations: number;
    appliedMigrations: number;
    pendingMigrations: string[];
  }> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    
    const pendingMigrations = this.migrations
      .filter(m => !appliedVersions.has(m.version))
      .map(m => m.version);

    return {
      totalMigrations: this.migrations.length,
      appliedMigrations: appliedMigrations.length,
      pendingMigrations
    };
  }
}

// Create a default mock execution function for development
const mockExecuteSQL = async (sql: string): Promise<any> => {
  console.log('📊 Mock SQL execution:', sql.substring(0, 100) + '...');
  return { rows: [], rowCount: 0 };
};

// Export singleton instance
export const migrationRunner = new MigrationRunner(mockExecuteSQL);
