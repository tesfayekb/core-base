import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: '014',
  name: 'add_superadmin_user_creation',
  script: `
-- Add SuperAdmin User Creation Function
-- Allows SuperAdmin users to create new users bypassing RLS policies

-- Create a function that allows SuperAdmin users to create new users
CREATE OR REPLACE FUNCTION create_user_as_admin(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_tenant_id UUID DEFAULT NULL,
  p_status user_status DEFAULT 'active'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_user_id UUID;
  v_is_super_admin BOOLEAN := FALSE;
  v_default_tenant_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create users';
  END IF;
  
  -- Check if current user is SuperAdmin
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_current_user_id
    AND r.name = 'SuperAdmin'
  ) INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Only SuperAdmin users can create new users';
  END IF;
  
  -- Generate new user ID
  v_user_id := gen_random_uuid();
  
  -- Get default tenant if none provided
  IF p_tenant_id IS NULL THEN
    SELECT id INTO v_default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
    IF v_default_tenant_id IS NULL THEN
      INSERT INTO tenants(name, slug, status)
      VALUES ('Default Organization', 'default', 'active')
      RETURNING id INTO v_default_tenant_id;
    END IF;
    p_tenant_id := v_default_tenant_id;
  END IF;
  
  -- Insert user directly (bypassing RLS due to SECURITY DEFINER)
  INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    first_name,
    last_name,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_tenant_id,
    p_email,
    'admin_created', -- Placeholder for admin-created users
    p_first_name,
    p_last_name,
    p_status,
    NOW(),
    NOW()
  );
  
  -- Add user-tenant relationship
  INSERT INTO user_tenants (user_id, tenant_id, is_primary)
  VALUES (v_user_id, p_tenant_id, true)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
  
  -- Log the creation
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    created_at
  ) VALUES (
    v_current_user_id,
    'create_user',
    'users',
    v_user_id,
    jsonb_build_object(
      'created_user_email', p_email,
      'created_user_id', v_user_id,
      'method', 'admin_function'
    ),
    NOW()
  );
  
  RETURN v_user_id;
END;
$$;

-- Add a policy to allow SuperAdmin users to insert users for others
CREATE POLICY "users_insert_superadmin" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is SuperAdmin
    EXISTS(
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'SuperAdmin'
    )
    OR
    -- Allow users to insert their own profile (existing policy)
    id = auth.uid()
  );

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "users_insert_self" ON users;
  `
};

export default migration;
