import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '007',
  name: 'fix_rls_policies_for_initial_setup',
  script: `
-- Fix RLS Policies for Initial Setup
-- Version: 1.0.0
-- Date: 2025-01-27
-- Purpose: Allow authenticated users to create initial tenant and related data

-- Drop existing policies that are too restrictive for initial setup
DO $$ 
BEGIN
    -- Drop tenant policies if they exist
    DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;
    DROP POLICY IF EXISTS "Users can update their tenants" ON tenants;
    DROP POLICY IF EXISTS "Users can create tenants" ON tenants;
    
    -- Drop user_tenants policies if they exist
    DROP POLICY IF EXISTS "Users can view their memberships" ON user_tenants;
    DROP POLICY IF EXISTS "Users can create their memberships" ON user_tenants;
    
    -- Drop users policies if they exist
    DROP POLICY IF EXISTS "Users can view all users in their tenants" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert their profile" ON users;
    
    -- Drop roles policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can manage roles" ON roles;
    
    -- Drop user_roles policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can manage user roles" ON user_roles;
END $$;

-- Tenants table policies
-- Allow authenticated users to create tenants
CREATE POLICY "tenants_insert_authenticated" ON tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to view their own tenants
CREATE POLICY "tenants_select_member" ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id 
      FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to update their tenants
CREATE POLICY "tenants_update_member" ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id 
      FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- User_tenants table policies
-- Allow users to create their own memberships
CREATE POLICY "user_tenants_insert_self" ON user_tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to view their own memberships
CREATE POLICY "user_tenants_select_self" ON user_tenants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users table policies
-- Allow users to insert their own profile
CREATE POLICY "users_insert_self" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow users to view all users (simplified for initial setup, should be refined later)
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "users_update_self" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Roles table policies
-- Allow authenticated users to manage roles (temporary for initial setup)
CREATE POLICY "roles_all_authenticated" ON roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- User_roles table policies
-- Allow authenticated users to manage user roles (temporary for initial setup)
CREATE POLICY "user_roles_all_authenticated" ON user_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Note: These policies are simplified for initial setup and should be refined
-- in production to include proper tenant isolation and role-based access control
  `
};

export default migration;
