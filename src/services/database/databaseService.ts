
// Database Service for Migration Management
// Version: 1.0.0
// Phase 1.2: Database Foundation

import { MigrationRunner, Migration } from '../migrations/migrationRunner';

// Import all migration files
import migration000 from '../migrations/migrations/000_migration_infrastructure';
import migration001 from '../migrations/migrations/001_create_core_schema';
import migration002 from '../migrations/migrations/002_create_rbac_tables';
import migration003 from '../migrations/migrations/003_create_audit_session_tables';
import migration004 from '../migrations/migrations/004_create_indexes';
import migration005 from '../migrations/migrations/005_enable_rls_policies';
import migration006 from '../migrations/migrations/006_create_utility_functions';

export interface DatabaseConfig {
  connectionString: string;
}

export class DatabaseService {
  private migrationRunner: MigrationRunner;
  private isInitialized = false;

  constructor(private config: DatabaseConfig) {
    // Mock SQL execution for now - in real implementation this would use actual database connection
    this.migrationRunner = new MigrationRunner(this.executeSQL.bind(this));
    this.registerMigrations();
  }

  /**
   * Mock SQL execution - replace with actual database connection
   */
  private async executeSQL(sql: string): Promise<any> {
    console.log('📊 Executing SQL:', sql.substring(0, 100) + '...');
    
    // Mock successful execution
    return {
      rows: [],
      rowCount: 0
    };
  }

  /**
   * Register all migration files
   */
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

  /**
   * Initialize the database with all migrations
   */
  async initialize(appliedBy?: string): Promise<void> {
    if (this.isInitialized) {
      console.log('⏭️ Database already initialized, skipping');
      return;
    }

    try {
      console.log('🚀 Initializing database...');

      // Initialize migration system
      await this.migrationRunner.initialize();

      // Validate existing migrations
      const isValid = await this.migrationRunner.validateMigrations();
      if (!isValid) {
        throw new Error('Migration validation failed');
      }

      // Run all pending migrations
      await this.migrationRunner.runMigrations(appliedBy);

      this.isInitialized = true;
      console.log('✅ Database initialization completed');

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus() {
    return await this.migrationRunner.getStatus();
  }

  /**
   * Force re-initialization (for development)
   */
  async forceReinitialize(appliedBy?: string): Promise<void> {
    this.isInitialized = false;
    await this.initialize(appliedBy);
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.executeSQL('SELECT 1');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Set tenant context for current session
   */
  async setTenantContext(tenantId: string): Promise<void> {
    await this.executeSQL(`SELECT set_tenant_context('${tenantId}')`);
  }

  /**
   * Set user context for current session
   */
  async setUserContext(userId: string): Promise<void> {
    await this.executeSQL(`SELECT set_user_context('${userId}')`);
  }

  /**
   * Clear all contexts
   */
  async clearContexts(): Promise<void> {
    await this.executeSQL("SELECT set_config('app.current_tenant_id', NULL, false)");
    await this.executeSQL("SELECT set_config('app.current_user_id', NULL, false)");
  }

  /**
   * Execute a custom query (with context validation)
   */
  async query(sql: string, params?: any[]): Promise<any> {
    // In real implementation, this would validate tenant context and execute query
    console.log('🔍 Executing query with context validation:', sql.substring(0, 50) + '...');
    return await this.executeSQL(sql);
  }
}

// Export singleton instance for application use
export const databaseService = new DatabaseService({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/enterprise_system'
});
