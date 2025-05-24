// Database Service for Migration Management
// Version: 1.1.0
// Phase 1.2: Database Foundation - Real Supabase Integration

import { MigrationRunner, Migration } from '../migrations/migrationRunner';
import { supabase } from '../database';

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
    // Use real Supabase connection
    this.migrationRunner = new MigrationRunner();
    this.registerMigrations();
  }

  /**
   * Test database connection using Supabase
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
      console.log('🚀 Initializing database with Supabase...');

      // Test connection first
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Database connection test failed');
      }

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
   * Set tenant context for current session
   */
  async setTenantContext(tenantId: string): Promise<void> {
    const { error } = await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
    if (error) {
      throw new Error(`Failed to set tenant context: ${error.message}`);
    }
  }

  /**
   * Set user context for current session
   */
  async setUserContext(userId: string): Promise<void> {
    const { error } = await supabase.rpc('set_user_context', { user_id: userId });
    if (error) {
      throw new Error(`Failed to set user context: ${error.message}`);
    }
  }

  /**
   * Clear all contexts
   */
  async clearContexts(): Promise<void> {
    const { error: tenantError } = await supabase.rpc('execute_sql', { 
      sql_query: "SELECT set_config('app.current_tenant_id', NULL, false)" 
    });
    const { error: userError } = await supabase.rpc('execute_sql', { 
      sql_query: "SELECT set_config('app.current_user_id', NULL, false)" 
    });
    
    if (tenantError || userError) {
      throw new Error('Failed to clear contexts');
    }
  }

  /**
   * Execute a custom query with Supabase
   */
  async query(sql: string, params?: any[]): Promise<any> {
    console.log('🔍 Executing query with Supabase:', sql.substring(0, 50) + '...');
    
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
    
    return { rows: data || [], rowCount: Array.isArray(data) ? data.length : 0 };
  }
}

// Export singleton instance for application use
export const databaseService = new DatabaseService();
