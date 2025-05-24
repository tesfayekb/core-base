
// Database Service - Refactored with Extracted Components
// Version: 6.0.0 - Refactored for better maintainability

import { MigrationRunner, Migration } from '../migrations/migrationRunner';
import { tenantContextService } from './core/TenantContextService';
import { connectionService, supabase } from './core/ConnectionService';
import { connectionPool } from './connectionPool';
import { errorRecovery } from './errorRecovery';
import { databaseHealthMonitor } from './monitoring/DatabaseHealthMonitor';
import { phase1Monitor } from '../performance/Phase1Monitor';
import { DatabaseConfigManager, DatabaseConfig } from './config/DatabaseConfig';

// Import all migration files
import migration000 from '../migrations/migrations/000_migration_infrastructure';
import migration001 from '../migrations/migrations/001_create_core_schema';
import migration002 from '../migrations/migrations/002_create_rbac_tables';
import migration003 from '../migrations/migrations/003_create_audit_session_tables';
import migration004 from '../migrations/migrations/004_create_indexes';
import migration005 from '../migrations/migrations/005_enable_rls_policies';
import migration006 from '../migrations/migrations/006_create_utility_functions';

export class DatabaseService {
  private migrationRunner: MigrationRunner;
  private configManager: DatabaseConfigManager;

  constructor(config: DatabaseConfig = {}) {
    this.configManager = DatabaseConfigManager.getInstance(config);
    this.migrationRunner = new MigrationRunner();
    this.registerMigrations();
    this.initializeEnhancedFeatures();
  }

  private initializeEnhancedFeatures(): void {
    const config = this.configManager.getConfig();
    
    if (config.enableConnectionPooling) {
      this.initializeConnectionPool();
    }
    
    if (config.enableMonitoring) {
      databaseHealthMonitor.startMonitoring();
    }
  }

  private async initializeConnectionPool(): Promise<void> {
    try {
      await connectionPool.initialize();
      console.log('✅ Connection pool initialized');
    } catch (error) {
      console.error('❌ Failed to initialize connection pool:', error);
    }
  }

  async testConnection(): Promise<boolean> {
    const config = this.configManager.getConfig();
    
    if (config.enableErrorRecovery) {
      return await errorRecovery.executeWithRecovery(
        () => connectionService.testConnectionAsync(),
        'database-connection-test'
      );
    }
    return await connectionService.testConnectionAsync();
  }

  async query(sql: string): Promise<any> {
    const startTime = performance.now();
    const config = this.configManager.getConfig();
    
    try {
      const operation = async () => {
        if (config.enableConnectionPooling) {
          return await this.executeWithConnectionPool(sql);
        } else {
          return await this.executeDirectQuery(sql);
        }
      };

      let result;
      if (config.enableErrorRecovery) {
        result = await errorRecovery.executeWithRecovery(operation, 'database-query');
      } else {
        result = await operation();
      }

      const duration = performance.now() - startTime;
      phase1Monitor.recordDatabaseQuery(duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      phase1Monitor.recordDatabaseQuery(duration);
      console.error('Database query failed:', error);
      throw error;
    }
  }

  private async executeWithConnectionPool(sql: string): Promise<any> {
    const client = await connectionPool.acquire();
    try {
      const { data, error } = await client.rpc('execute_sql', { sql_query: sql });
      if (error) {
        throw new Error(`Query execution failed: ${error.message}`);
      }
      return { rows: data || [], rowCount: Array.isArray(data) ? data.length : 0 };
    } finally {
      await connectionPool.release(client);
    }
  }

  private async executeDirectQuery(sql: string): Promise<any> {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    if (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
    return { rows: data || [], rowCount: Array.isArray(data) ? data.length : 0 };
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
    const status = this.configManager.getStatus();
    if (status.isInitialized) {
      console.log('⏭️ Database already initialized, skipping');
      return;
    }

    const config = this.configManager.getConfig();
    const operation = async () => {
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
      this.configManager.setInitialized(appliedBy);
      console.log('✅ Database initialization completed with enhanced security');
    };

    if (config.enableErrorRecovery) {
      await errorRecovery.executeWithRecovery(operation, 'database-initialization');
    } else {
      await operation();
    }
  }

  async getStatus() {
    return await this.migrationRunner.getStatus();
  }

  async forceReinitialize(appliedBy?: string): Promise<void> {
    this.configManager.reset();
    await this.initialize(appliedBy);
  }

  // Tenant context methods (delegated to focused service)
  async setTenantContext(tenantId: string): Promise<void> {
    const startTime = performance.now();
    
    try {
      const result = await tenantContextService.setTenantContext(tenantId);
      if (!result.success) {
        throw new Error(`Failed to set tenant context: ${result.error}`);
      }
      
      const duration = performance.now() - startTime;
      phase1Monitor.recordTenantSwitch(duration);
    } catch (error) {
      const duration = performance.now() - startTime;
      phase1Monitor.recordTenantSwitch(duration);
      throw error;
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

  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    components: Record<string, any>;
  } {
    const config = this.configManager.getConfig();
    return databaseHealthMonitor.getHealthStatus(
      config.enableConnectionPooling || false,
      config.enableErrorRecovery || false
    );
  }

  getMetrics(): {
    database: any;
    connectionPool?: any;
    errorRecovery?: any;
    alerts?: any;
  } {
    const config = this.configManager.getConfig();
    return databaseHealthMonitor.getMetrics(
      config.enableConnectionPooling || false,
      config.enableErrorRecovery || false,
      config.enableMonitoring || false
    );
  }

  async cleanup(): Promise<void> {
    databaseHealthMonitor.cleanup();

    const config = this.configManager.getConfig();
    if (config.enableConnectionPooling) {
      await connectionPool.cleanup();
    }

    console.log('🧹 Database service cleanup completed');
  }
}

export const databaseService = new DatabaseService({
  enableConnectionPooling: true,
  enableErrorRecovery: true,
  enableMonitoring: true
});
