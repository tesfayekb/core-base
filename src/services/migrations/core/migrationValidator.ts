
// Migration Validation and Integrity Checking
// Version: 1.0.0
// Phase 1.2: Database Foundation

import { createHash } from 'crypto';
import { Migration, MigrationRecord, SQLExecutor } from '../types/migrationTypes';

export class MigrationValidator {
  private executeSQL: SQLExecutor;

  constructor(executeSQL: SQLExecutor) {
    this.executeSQL = executeSQL;
  }

  /**
   * Generate hash for migration script
   */
  generateHash(script: string): string {
    return createHash('sha256').update(script).digest('hex');
  }

  /**
   * Validate migration integrity
   */
  async validateMigrations(localMigrations: Migration[]): Promise<boolean> {
    console.log('🔍 Validating migration integrity...');

    try {
      const appliedMigrations = await this.getAppliedMigrations();
      
      for (const appliedMigration of appliedMigrations) {
        const localMigration = localMigrations.find(m => m.version === appliedMigration.version);
        
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
    try {
      const result = await this.executeSQL(`SELECT 1 FROM migrations WHERE version = '${version}' LIMIT 1`);
      return (result.rows && result.rows.length > 0) || (Array.isArray(result) && result.length > 0);
    } catch (error) {
      console.error('❌ Failed to check migration status:', error);
      return false;
    }
  }
}
