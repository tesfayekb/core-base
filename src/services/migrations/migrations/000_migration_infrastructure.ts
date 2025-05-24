
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '000',
  name: 'migration_infrastructure',
  script: `
-- Migration Infrastructure Setup
-- Version: 1.0.0
-- Phase 1.0: Migration System Foundation

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version CHARACTER VARYING NOT NULL UNIQUE,
  name CHARACTER VARYING NOT NULL,
  script TEXT NOT NULL,
  hash CHARACTER VARYING NOT NULL,
  applied_by CHARACTER VARYING,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to create migrations table (for migration runner)
CREATE OR REPLACE FUNCTION create_migrations_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
  -- Table creation is idempotent above
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute migration scripts
CREATE OR REPLACE FUNCTION execute_migration(migration_script TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE migration_script;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `
};

export default migration;
