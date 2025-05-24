
// Migration Rollback System
// Version: 1.0.0
// Phase 1.2: Enhanced Database Foundation - Migration Rollback

import { Migration, SQLExecutor } from '../types/migrationTypes';
import { MigrationValidator } from './migrationValidator';

export interface RollbackPlan {
  migrationVersion: string;
  rollbackScript: string;
  dependencies: string[];
  validation: string;
}

export interface RollbackResult {
  success: boolean;
  migrationsRolledBack: string[];
  errors: string[];
  rollbackTime: number;
}

export class MigrationRollback {
  private rollbackPlans = new Map<string, RollbackPlan>();

  constructor(
    private executeSQL: SQLExecutor,
    private validator: MigrationValidator
  ) {}

  /**
   * Register a rollback plan for a migration
   */
  registerRollbackPlan(plan: RollbackPlan): void {
    this.rollbackPlans.set(plan.migrationVersion, plan);
    console.log(`📋 Registered rollback plan for migration ${plan.migrationVersion}`);
  }

  /**
   * Rollback to a specific migration version
   */
  async rollbackTo(targetVersion: string, appliedBy?: string): Promise<RollbackResult> {
    const startTime = Date.now();
    const result: RollbackResult = {
      success: false,
      migrationsRolledBack: [],
      errors: [],
      rollbackTime: 0
    };

    try {
      console.log(`🔄 Starting rollback to version ${targetVersion}...`);

      // Get applied migrations after target version
      const appliedMigrations = await this.validator.getAppliedMigrations();
      const migrationsToRollback = appliedMigrations
        .filter(m => m.version > targetVersion)
        .sort((a, b) => b.version.localeCompare(a.version)); // Reverse order

      if (migrationsToRollback.length === 0) {
        console.log('ℹ️ No migrations to rollback');
        result.success = true;
        return result;
      }

      console.log(`📝 Rolling back ${migrationsToRollback.length} migrations`);

      // Validate rollback dependencies
      const validationResult = await this.validateRollbackPlan(migrationsToRollback.map(m => m.version));
      if (!validationResult.valid) {
        result.errors.push(`Rollback validation failed: ${validationResult.reason}`);
        return result;
      }

      // Execute rollbacks in reverse order
      for (const migration of migrationsToRollback) {
        try {
          await this.rollbackMigration(migration.version, appliedBy);
          result.migrationsRolledBack.push(migration.version);
          console.log(`✅ Rolled back migration ${migration.version}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to rollback ${migration.version}: ${errorMsg}`);
          console.error(`❌ Rollback failed for ${migration.version}:`, errorMsg);
          break; // Stop on first failure
        }
      }

      result.success = result.errors.length === 0;
      result.rollbackTime = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ Rollback completed successfully in ${result.rollbackTime}ms`);
      } else {
        console.error(`❌ Rollback partially failed. Errors: ${result.errors.join(', ')}`);
      }

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Rollback process failed: ${errorMsg}`);
      result.rollbackTime = Date.now() - startTime;
      console.error('❌ Rollback process failed:', errorMsg);
      return result;
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(version: string, appliedBy?: string): Promise<void> {
    const rollbackPlan = this.rollbackPlans.get(version);
    if (!rollbackPlan) {
      throw new Error(`No rollback plan found for migration ${version}`);
    }

    console.log(`🔄 Rolling back migration ${version}...`);

    try {
      // Execute rollback script using enhanced security function
      const result = await this.executeSQL(`
        SELECT execute_migration_rollback(
          '${version}',
          $rollback$${rollbackPlan.rollbackScript}$rollback$
        ) as result;
      `);

      if (!result.rows[0]?.result?.success) {
        throw new Error(`Rollback execution failed: ${result.rows[0]?.result?.message || 'Unknown error'}`);
      }

      // Update migration record to mark as rolled back
      await this.executeSQL(`
        UPDATE migrations 
        SET 
          success = FALSE,
          error_message = 'Rolled back by ${appliedBy || 'system'}',
          applied_at = CURRENT_TIMESTAMP
        WHERE version = '${version}';
      `);

      // Validate rollback completion
      if (rollbackPlan.validation) {
        const validationResult = await this.executeSQL(rollbackPlan.validation);
        if (!validationResult.rows[0]?.valid) {
          throw new Error(`Rollback validation failed for ${version}`);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to rollback migration ${version}:`, error);
      throw error;
    }
  }

  /**
   * Validate rollback plan dependencies
   */
  private async validateRollbackPlan(versions: string[]): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Check if all migrations have rollback plans
    for (const version of versions) {
      if (!this.rollbackPlans.has(version)) {
        return {
          valid: false,
          reason: `No rollback plan found for migration ${version}`
        };
      }
    }

    // Check dependency requirements
    for (const version of versions) {
      const plan = this.rollbackPlans.get(version)!;
      for (const dependency of plan.dependencies) {
        if (!versions.includes(dependency)) {
          return {
            valid: false,
            reason: `Rollback dependency ${dependency} not included in rollback plan`
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Test rollback plans without executing them
   */
  async testRollbackPlans(versions: string[]): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    for (const version of versions) {
      const plan = this.rollbackPlans.get(version);
      if (!plan) {
        issues.push(`Missing rollback plan for ${version}`);
        continue;
      }

      // Test SQL syntax
      try {
        await this.executeSQL(`EXPLAIN ${plan.rollbackScript}`);
      } catch (error) {
        issues.push(`Invalid rollback SQL for ${version}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Test validation query
      if (plan.validation) {
        try {
          await this.executeSQL(`EXPLAIN ${plan.validation}`);
        } catch (error) {
          issues.push(`Invalid validation SQL for ${version}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get rollback plans summary
   */
  getRollbackPlans(): Array<{
    version: string;
    hasPlan: boolean;
    dependencies: string[];
  }> {
    return Array.from(this.rollbackPlans.entries()).map(([version, plan]) => ({
      version,
      hasPlan: true,
      dependencies: plan.dependencies
    }));
  }
}
