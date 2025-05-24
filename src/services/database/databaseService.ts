
// Database Service - Orchestration Layer
// Version: 2.0.0
// Phase 1.2: Database Foundation - Refactored with Focused Services

import { MigrationRunner, Migration } from '../migrations/migrationRunner';
import { tenantContextService } from './tenantContext';
import { testConnection } from './connection';

// Import all migration files
import migration000 from '../migrations/migrations/000_migration_infrastructure';
import migration001 from '../migrations/migrations/001_create_core_schema';
import migration002 from '../migrations/migrations/002_create_rbac_tables';
import migration003 from '../migrations/migrations/003_create_audit_session_tables';
import migration004 from '../migrations/migrations/004_create_indexes';
import migration005 from '../migrations/migrations/005_enable_rls_policies';
import migration006 from '../migrations/migrations/006_create_utility_functions';

export interface DatabaseConfig {
  connectionString?: string;
}

export class DatabaseService {
  private migrationRunner: MigrationRunner;
  private isInitialized = false;

  constructor(private config: DatabaseConfig = {}) {
    this.migrationRunner = new MigrationRunner();
    this.registerMigrations();
  }

  async testConnection(): Promise<boolean> {
    return await testConnection();
  }

  private registerMigrations(): void {
    const migrations: Migration[] = [
      migration000,
      migration001,
      migration002,
      migration003,
      migration004,
      migration005,
      migration006
    ];

    migrations.forEach(migration => {
      this.migrationRunner.addMigration(migration);
    });
  }

  async initialize(appliedBy?: string): Promise<void> {
    if (this.isInitialized) {
      console.log('⏭️ Database already initialized, skipping');
      return;
    }

    try {
      console.log('🚀 Initializing database with enhanced security...');

      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Database connection test failed');
      }

      await this.migrationRunner.initialize();
      const isValid = await this.migrationRunner.validateMigrations();
      if (!isValid) {
        throw new Error('Migration validation failed');
      }

      await this.migrationRunner.runMigrations(appliedBy);
      this.isInitialized = true;
      console.log('✅ Database initialization completed with enhanced security');

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async getStatus() {
    return await this.migrationRunner.getStatus();
  }

  async forceReinitialize(appliedBy?: string): Promise<void> {
    this.isInitialized = false;
    await this.initialize(appliedBy);
  }

  // Tenant context methods (delegated to focused service)
  async setTenantContext(tenantId: string): Promise<void> {
    const result = await tenantContextService.setTenantContext(tenantId);
    if (!result.success) {
      throw new Error(`Failed to set tenant context: ${result.error}`);
    }
  }

  async setUserContext(userId: string): Promise<void> {
    const result = await tenantContextService.setUserContext(userId);
    if (!result.success) {
      throw new Error(`Failed to set user context: ${result.error}`);
    }
  }

  async clearContexts(): Promise<void> {
    tenantContextService.clearContext();
  }
}

export const databaseService = new DatabaseService();
