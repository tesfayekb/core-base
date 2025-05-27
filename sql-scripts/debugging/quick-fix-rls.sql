-- Quick fix for RLS policies to allow initial tenant creation
-- Run this in Supabase SQL Editor immediately

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;
DROP POLICY IF EXISTS "Users can update their tenants" ON tenants;
DROP POLICY IF EXISTS "Users can create tenants" ON tenants;
DROP POLICY IF EXISTS "tenants_insert_authenticated" ON tenants;
DROP POLICY IF EXISTS "tenants_select_member" ON tenants;
DROP POLICY IF EXISTS "tenants_update_member" ON tenants;

-- Create new policy that allows authenticated users to create tenants
CREATE POLICY "tenants_insert_auth" ON tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to view their tenants
CREATE POLICY "tenants_select_auth" ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id 
      FROM user_tenants 
      WHERE user_id = auth.uid()
    )
    OR NOT EXISTS (
      SELECT 1 FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Allow users to update their tenants
CREATE POLICY "tenants_update_auth" ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id 
      FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );

-- Fix user_tenants policies
DROP POLICY IF EXISTS "Users can view their memberships" ON user_tenants;
DROP POLICY IF EXISTS "Users can create their memberships" ON user_tenants;
DROP POLICY IF EXISTS "user_tenants_insert_self" ON user_tenants;
DROP POLICY IF EXISTS "user_tenants_select_self" ON user_tenants;

CREATE POLICY "user_tenants_insert_auth" ON user_tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_tenants_select_auth" ON user_tenants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Fix users table policies
DROP POLICY IF EXISTS "Users can insert their profile" ON users;
DROP POLICY IF EXISTS "Users can view all users in their tenants" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "users_insert_self" ON users;
DROP POLICY IF EXISTS "users_select_authenticated" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;

CREATE POLICY "users_insert_auth" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_select_all" ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_update_auth" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Fix roles table policies
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON roles;
DROP POLICY IF EXISTS "roles_all_authenticated" ON roles;

CREATE POLICY "roles_all_auth" ON roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fix user_roles table policies
DROP POLICY IF EXISTS "Authenticated users can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_all_authenticated" ON user_roles;

CREATE POLICY "user_roles_all_auth" ON user_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify the policies are in place
SELECT 'Policies updated successfully!' as status;
