
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '013',
  name: 'fix_superadmin_role_tenant_constraints',
  script: `
-- Fix SuperAdmin Role Tenant Constraints
-- Version: 1.0.0
-- Date: 2025-06-03
-- Purpose: Allow system roles to have NULL tenant_id and enforce SuperAdmin-only access to system roles

-- Allow NULL tenant_id for system roles by modifying the constraint
ALTER TABLE roles ALTER COLUMN tenant_id DROP NOT NULL;

-- Update existing SuperAdmin role to remove tenant_id (system-wide role)
UPDATE roles 
SET tenant_id = NULL
WHERE name = 'SuperAdmin' 
AND is_system_role = true;

-- Add constraint to ensure data integrity: system roles can have NULL tenant_id, non-system roles must have tenant_id
ALTER TABLE roles ADD CONSTRAINT roles_tenant_id_system_check 
CHECK (
  (is_system_role = true AND tenant_id IS NULL) OR 
  (is_system_role = false AND tenant_id IS NOT NULL)
);

-- Create function to check if current user is SuperAdmin
CREATE OR REPLACE FUNCTION is_current_user_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = current_user_id()
    AND r.name = 'SuperAdmin'
    AND r.is_system_role = true
  );
END;
$$;

-- Create trigger function to enforce SuperAdmin-only access to system roles
CREATE OR REPLACE FUNCTION enforce_system_role_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For INSERT, UPDATE, DELETE operations on system roles
  IF (TG_OP = 'INSERT' AND NEW.is_system_role = true) OR
     (TG_OP = 'UPDATE' AND (NEW.is_system_role = true OR OLD.is_system_role = true)) OR
     (TG_OP = 'DELETE' AND OLD.is_system_role = true) THEN
    
    -- Check if current user is SuperAdmin
    IF NOT is_current_user_superadmin() THEN
      RAISE EXCEPTION 'Only SuperAdmin users can create, update, or delete system roles';
    END IF;
  END IF;
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create the trigger to enforce system role access control
CREATE TRIGGER system_role_access_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_system_role_access();
  `
};

export default migration;
