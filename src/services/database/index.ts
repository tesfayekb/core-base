
// Database Services Entry Point
// Version: 2.0.0
// Phase 1.2: Database Foundation - Refactored Services

// Export connection
export { supabase, testConnection } from './connection';

// Export focused services
export { tenantContextService, TenantContextService } from './tenantContext';
export { permissionService, PermissionService } from './permissionService';
export { auditService, AuditService } from './auditService';

// Export migration runner
export { migrationRunner, MigrationRunner } from '../migrations/migrationRunner';

// Re-export for backward compatibility
export const database = {
  supabase,
  tenantContextService,
  permissionService,
  auditService
};
