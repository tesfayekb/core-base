
// Migration System Types and Interfaces
// Version: 1.0.0
// Phase 1.2: Database Foundation

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

export interface MigrationStatus {
  totalMigrations: number;
  appliedMigrations: number;
  pendingMigrations: string[];
}

export type SQLExecutor = (sql: string) => Promise<any>;
