
// Migration Status Tracking
// Version: 1.0.0
// Phase 1.2: Database Foundation

import { Migration, MigrationStatus } from '../types/migrationTypes';
import { MigrationValidator } from './migrationValidator';

export class MigrationStatusTracker {
  private validator: MigrationValidator;

  constructor(validator: MigrationValidator) {
    this.validator = validator;
  }

  /**
   * Get migration status summary
   */
  async getStatus(migrations: Migration[]): Promise<MigrationStatus> {
    const appliedMigrations = await this.validator.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    
    const pendingMigrations = migrations
      .filter(m => !appliedVersions.has(m.version))
      .map(m => m.version);

    return {
      totalMigrations: migrations.length,
      appliedMigrations: appliedMigrations.length,
      pendingMigrations
    };
  }
}
