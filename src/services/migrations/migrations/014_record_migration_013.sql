
-- Record that migration 013 has been run
-- This updates the migrations table to show the SuperAdmin role fixes were applied

-- Insert migration 013 record
INSERT INTO migrations (version, name, script, hash, applied_by, applied_at)
VALUES (
  '013',
  'fix_superadmin_role_tenant_constraints',
  '-- Fix SuperAdmin Role Tenant Constraints
-- Version: 1.0.0
-- Date: 2025-06-03
-- Purpose: Allow system roles to have NULL tenant_id and enforce SuperAdmin-only access to system roles

-- Allow NULL tenant_id for system roles...
-- (Full script content abbreviated for brevity)',
  'superadmin_fix_2025_06_03',
  'manual_sql_execution',
  NOW()
)
ON CONFLICT (version) DO UPDATE
SET 
  applied_at = NOW(),
  applied_by = 'manual_sql_execution';

-- Show recent migrations
SELECT version, name, applied_at, applied_by 
FROM migrations 
WHERE version IN ('012', '013', '014')
ORDER BY version;
