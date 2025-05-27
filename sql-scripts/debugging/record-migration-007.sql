-- Record that migration 007 has been run
-- This updates the migrations table to show the RLS policies fix was applied

-- First check if migrations table exists
CREATE TABLE IF NOT EXISTS migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version CHARACTER VARYING NOT NULL UNIQUE,
  name CHARACTER VARYING NOT NULL,
  script TEXT NOT NULL,
  hash CHARACTER VARYING NOT NULL,
  applied_by CHARACTER VARYING,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert migration 007 record
INSERT INTO migrations (version, name, script, hash, applied_by, applied_at)
VALUES (
  '007',
  'fix_rls_policies_for_initial_setup',
  '-- Fix RLS Policies for Initial Setup
-- Version: 1.0.0
-- Date: 2025-01-27
-- Purpose: Allow authenticated users to create initial tenant and related data

-- Drop existing policies and create new ones...
-- (Full script content abbreviated for brevity)',
  'rls_fix_2025_01_27',
  'manual_sql_execution',
  NOW()
)
ON CONFLICT (version) DO UPDATE
SET 
  applied_at = NOW(),
  applied_by = 'manual_sql_execution';

-- Show all migrations
SELECT version, name, applied_at, applied_by 
FROM migrations 
ORDER BY version;
