
// Database Services Entry Point - Updated with Refactored Components
// Version: 3.0.0
// Phase 1.2: Database Foundation - Refactored Services

// Export connection
export { supabase, testConnection } from './connection';

// Export focused services
export { tenantContextService, TenantContextService } from './tenantContext';
export { permissionService, PermissionService } from './permissionService';
export { auditService, AuditService } from './auditService';

// Export enhanced infrastructure
export { databaseService, DatabaseService } from './databaseService';
export { connectionPool, DatabaseConnectionPool } from './connectionPool';
export { errorRecovery, DatabaseErrorRecovery } from './errorRecovery';

// Export monitoring
export { databaseHealthMonitor, DatabaseHealthMonitor } from './monitoring/DatabaseHealthMonitor';

// Export migration runner
export { migrationRunner, MigrationRunner } from '../migrations/migrationRunner';

// Import for re-export
import { supabase } from './connection';
import { tenantContextService } from './tenantContext';
import { permissionService } from './permissionService';
import { auditService } from './auditService';

// Re-export for backward compatibility
export const database = {
  supabase,
  tenantContextService,
  permissionService,
  auditService
};
