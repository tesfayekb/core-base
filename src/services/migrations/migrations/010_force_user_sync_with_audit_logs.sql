
-- Final Fix for missing user and audit logs in synchronization

-- Step 1: Create audit logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sync_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  operation TEXT NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_user_sync_audit_logs_user_id ON user_sync_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_audit_logs_created_at ON user_sync_audit_logs(created_at);

-- Step 2: Check the structure of the user_tenants table
DO $$
DECLARE
  has_status BOOLEAN;
BEGIN
  -- Check if the status column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_tenants'
    AND column_name = 'status'
  ) INTO has_status;
  
  RAISE NOTICE 'user_tenants table has status column: %', has_status;
END $$;

-- Step 3: Force synchronization of ALL users
DO $$
DECLARE
  auth_user RECORD;
  default_tenant_id UUID;
  sync_result BOOLEAN;
  has_status BOOLEAN;
BEGIN
  -- Check if the status column exists in user_tenants
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_tenants'
    AND column_name = 'status'
  ) INTO has_status;
  
  -- Get the default tenant ID (critical for user-tenant association)
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  -- Create default tenant if it doesn't exist
  IF default_tenant_id IS NULL THEN
    INSERT INTO tenants(name, slug, status)
    VALUES ('Default Organization', 'default', 'active')
    RETURNING id INTO default_tenant_id;
    
    RAISE NOTICE 'Created default tenant with ID %', default_tenant_id;
  ELSE
    RAISE NOTICE 'Using existing default tenant with ID %', default_tenant_id;
  END IF;
  
  -- Loop through all auth users and force sync
  FOR auth_user IN SELECT * FROM auth.users LOOP
    -- Check if user exists in app table
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth_user.id) THEN
      -- Direct insert if user doesn't exist in application table
      INSERT INTO users (
        id,
        tenant_id,
        email,
        password_hash,
        first_name,
        last_name,
        status,
        email_verified_at,
        last_login_at,
        created_at,
        updated_at
      ) VALUES (
        auth_user.id,
        default_tenant_id,
        auth_user.email,
        '', -- We don't store the actual hash
        COALESCE(auth_user.raw_user_meta_data->>'first_name', ''),
        COALESCE(auth_user.raw_user_meta_data->>'last_name', ''),
        CASE
          WHEN auth_user.confirmed_at IS NOT NULL THEN 'active'::user_status
          ELSE 'pending_verification'::user_status
        END,
        auth_user.confirmed_at,
        auth_user.last_sign_in_at,
        auth_user.created_at,
        auth_user.updated_at
      );
      
      -- Ensure user-tenant relationship with dynamic SQL based on table structure
      IF has_status THEN
        -- If status column exists
        EXECUTE 'INSERT INTO user_tenants (user_id, tenant_id, status, is_primary)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (tenant_id, user_id) DO NOTHING'
        USING auth_user.id, default_tenant_id, 'active', true;
      ELSE
        -- If status column doesn't exist
        EXECUTE 'INSERT INTO user_tenants (user_id, tenant_id, is_primary)
                VALUES ($1, $2, $3)
                ON CONFLICT (tenant_id, user_id) DO NOTHING'
        USING auth_user.id, default_tenant_id, true;
      END IF;
      
      -- Log the manual sync
      INSERT INTO user_sync_audit_logs (user_id, operation, details)
      VALUES (auth_user.id, 'force_sync_insert', jsonb_build_object(
        'email', auth_user.email,
        'sync_time', NOW(),
        'has_last_login', (auth_user.last_sign_in_at IS NOT NULL)
      ));
      
      RAISE NOTICE 'Inserted missing user %', auth_user.email;
    ELSE
      -- Update existing user with current auth data
      UPDATE users SET
        email = auth_user.email,
        first_name = COALESCE(auth_user.raw_user_meta_data->>'first_name', first_name),
        last_name = COALESCE(auth_user.raw_user_meta_data->>'last_name', last_name),
        status = CASE
          WHEN auth_user.confirmed_at IS NOT NULL THEN 'active'::user_status
          ELSE status
        END,
        email_verified_at = COALESCE(auth_user.confirmed_at, email_verified_at),
        last_login_at = COALESCE(auth_user.last_sign_in_at, last_login_at),
        updated_at = NOW()
      WHERE id = auth_user.id;
      
      -- Log the update
      INSERT INTO user_sync_audit_logs (user_id, operation, details)
      VALUES (auth_user.id, 'force_sync_update', jsonb_build_object(
        'email', auth_user.email,
        'sync_time', NOW(),
        'has_last_login', (auth_user.last_sign_in_at IS NOT NULL)
      ));
      
      RAISE NOTICE 'Updated existing user %', auth_user.email;
    END IF;
  END LOOP;
END $$;
