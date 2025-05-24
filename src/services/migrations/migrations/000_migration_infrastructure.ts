
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '000',
  name: 'migration_infrastructure',
  script: `
-- Migration Infrastructure Setup
-- Version: 1.0.0
-- Phase 1.2: Migration System Foundation

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  script TEXT NOT NULL,
  hash VARCHAR NOT NULL,
  applied_by VARCHAR,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_version ON migrations(version);

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
