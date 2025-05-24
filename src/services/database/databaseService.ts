
// Database Service - Enhanced with Connection Pooling, Error Recovery & Monitoring
// Version: 3.0.0
// Phase 1.2: Database Foundation - Production-Ready Enhancements

import { MigrationRunner, Migration } from '../migrations/migrationRunner';
import { tenantContextService } from './tenantContext';
import { testConnection, supabase } from './connection';
import { connectionPool } from './connectionPool';
import { errorRecovery } from './errorRecovery';
import { alertingSystem } from '../monitoring/alertingSystem';
import { phase1Monitor } from '../performance/Phase1Monitor';

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
  enableConnectionPooling?: boolean;
  enableErrorRecovery?: boolean;
  enableMonitoring?: boolean;
}

export class DatabaseService {
  private migrationRunner: MigrationRunner;
  private isInitialized = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(private config: DatabaseConfig = {}) {
    this.migrationRunner = new MigrationRunner();
    this.registerMigrations();
    
    // Initialize enhanced features
    if (this.config.enableConnectionPooling !== false) {
      this.initializeConnectionPool();
    }
    
    if (this.config.enableMonitoring !== false) {
      this.startMonitoring();
    }
  }

  /**
   * Initialize connection pool
   */
  private async initializeConnectionPool(): Promise<void> {
    try {
      await connectionPool.initialize();
      console.log('✅ Connection pool initialized');
    } catch (error) {
      console.error('❌ Failed to initialize connection pool:', error);
    }
  }

  /**
   * Start performance monitoring and alerting
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Collect metrics from various sources
        const metrics = {
          database: phase1Monitor.getMetrics(),
          connectionPool: connectionPool.getMetrics(),
          errorRecovery: errorRecovery.getMetrics(),
          rbac: phase1Monitor.getMetrics().rbac,
          multiTenant: phase1Monitor.getMetrics().multiTenant
        };

        // Check for alerts
        await alertingSystem.checkAlerts(metrics);
        
        // Log health status periodically
        const health = this.getHealthStatus();
        if (!health.healthy) {
          console.warn('⚠️ Database service health issues:', health.issues);
        }
      } catch (error) {
        console.error('❌ Monitoring check failed:', error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Test database connection with error recovery
   */
  async testConnection(): Promise<boolean> {
    if (this.config.enableErrorRecovery !== false) {
      return await errorRecovery.executeWithRecovery(
        () => testConnection(),
        'database-connection-test'
      );
    }
    return await testConnection();
  }

  /**
   * Execute SQL query with enhanced error handling and monitoring
   * @param sql - SQL query to execute
   * @returns Query result with rows and metadata
   */
  async query(sql: string): Promise<any> {
    const startTime = performance.now();
    
    try {
      const operation = async () => {
        if (this.config.enableConnectionPooling !== false) {
          // Use connection pool
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
        } else {
          // Use direct connection
          const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
          if (error) {
            throw new Error(`Query execution failed: ${error.message}`);
          }
          return { rows: data || [], rowCount: Array.isArray(data) ? data.length : 0 };
        }
      };

      let result;
      if (this.config.enableErrorRecovery !== false) {
        result = await errorRecovery.executeWithRecovery(operation, 'database-query');
      } else {
        result = await operation();
      }

      // Record successful query performance
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
   * Initialize database with enhanced error handling
   */
  async initialize(appliedBy?: string): Promise<void> {
    if (this.isInitialized) {
      console.log('⏭️ Database already initialized, skipping');
      return;
    }

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
      this.isInitialized = true;
      console.log('✅ Database initialization completed with enhanced security');
    };

    if (this.config.enableErrorRecovery !== false) {
      await errorRecovery.executeWithRecovery(operation, 'database-initialization');
    } else {
      await operation();
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

  /**
   * Get comprehensive health status
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    components: Record<string, any>;
  } {
    const issues: string[] = [];
    const components: Record<string, any> = {};

    // Database performance health
    const dbHealth = phase1Monitor.getHealthStatus();
    components.database = dbHealth;
    if (!dbHealth.status === 'healthy') {
      issues.push(...dbHealth.issues);
    }

    // Connection pool health
    if (this.config.enableConnectionPooling !== false) {
      const poolHealth = connectionPool.getHealthStatus();
      components.connectionPool = poolHealth;
      if (!poolHealth.healthy) {
        issues.push(...poolHealth.issues);
      }
    }

    // Error recovery health
    if (this.config.enableErrorRecovery !== false) {
      const recoveryHealth = errorRecovery.getHealthStatus();
      components.errorRecovery = recoveryHealth;
      if (!recoveryHealth.healthy) {
        issues.push(...recoveryHealth.issues);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      components
    };
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): {
    database: any;
    connectionPool?: any;
    errorRecovery?: any;
    alerts?: any;
  } {
    const metrics: any = {
      database: phase1Monitor.getMetrics()
    };

    if (this.config.enableConnectionPooling !== false) {
      metrics.connectionPool = connectionPool.getMetrics();
    }

    if (this.config.enableErrorRecovery !== false) {
      metrics.errorRecovery = errorRecovery.getMetrics();
    }

    if (this.config.enableMonitoring !== false) {
      metrics.alerts = alertingSystem.getAlertStats();
    }

    return metrics;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.config.enableConnectionPooling !== false) {
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
