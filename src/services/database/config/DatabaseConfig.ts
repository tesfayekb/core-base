
// Database Service Configuration Management
// Extracted from databaseService.ts for better separation of concerns

export interface DatabaseConfig {
  connectionString?: string;
  enableConnectionPooling?: boolean;
  enableErrorRecovery?: boolean;
  enableMonitoring?: boolean;
}

export interface DatabaseStatus {
  isInitialized: boolean;
  migrationStatus: 'pending' | 'running' | 'completed' | 'failed';
  lastInitialization?: Date;
  appliedBy?: string;
}

export class DatabaseConfigManager {
  private static instance: DatabaseConfigManager;
  private config: DatabaseConfig;
  private status: DatabaseStatus;

  constructor(config: DatabaseConfig = {}) {
    this.config = {
      enableConnectionPooling: true,
      enableErrorRecovery: true,
      enableMonitoring: true,
      ...config
    };
    
    this.status = {
      isInitialized: false,
      migrationStatus: 'pending'
    };
  }

  static getInstance(config?: DatabaseConfig): DatabaseConfigManager {
    if (!DatabaseConfigManager.instance) {
      DatabaseConfigManager.instance = new DatabaseConfigManager(config);
    }
    return DatabaseConfigManager.instance;
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DatabaseConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getStatus(): DatabaseStatus {
    return { ...this.status };
  }

  updateStatus(updates: Partial<DatabaseStatus>): void {
    this.status = { ...this.status, ...updates };
  }

  setInitialized(appliedBy?: string): void {
    this.status = {
      ...this.status,
      isInitialized: true,
      migrationStatus: 'completed',
      lastInitialization: new Date(),
      appliedBy
    };
  }

  reset(): void {
    this.status = {
      isInitialized: false,
      migrationStatus: 'pending'
    };
  }
}
