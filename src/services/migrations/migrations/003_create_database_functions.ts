
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '003',
  name: 'create_database_functions',
  script: `
-- Tenant context function
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.tenant_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Set tenant context function
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration infrastructure functions
CREATE OR REPLACE FUNCTION create_migrations_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version CHARACTER VARYING NOT NULL UNIQUE,
    name CHARACTER VARYING NOT NULL,
    script TEXT NOT NULL,
    hash CHARACTER VARYING NOT NULL,
    applied_by CHARACTER VARYING,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute migration scripts
CREATE OR REPLACE FUNCTION execute_migration(migration_script TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE migration_script;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for tenants
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  `
};

export default migration;
