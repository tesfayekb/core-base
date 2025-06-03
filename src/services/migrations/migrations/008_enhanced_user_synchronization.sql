
-- Enhanced User Synchronization Migration Script
-- Resolves field mapping issues between auth.users and custom users table
-- Fixes the null last_login_at problem and name synchronization

-- Step 1: Create the enhanced sync function for auth.users to users
CREATE OR REPLACE FUNCTION sync_auth_user_to_users()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id UUID;
  sync_error TEXT;
BEGIN
  -- Wrap the entire process in exception handling to avoid breaking auth
  BEGIN
    -- Find the default tenant (assuming there is one with slug = 'default')
    SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
    
    -- If no default tenant exists, create one
    IF default_tenant_id IS NULL THEN
      INSERT INTO tenants(name, slug, status)
      VALUES ('Default Organization', 'default', 'active')
      RETURNING id INTO default_tenant_id;
    END IF;
    
    -- Sync based on the operation type (INSERT or UPDATE)
    IF (TG_OP = 'INSERT') THEN
      -- Insert the user into custom users table
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
        NEW.id,
        default_tenant_id,
        NEW.email,
        '', -- We don't store actual hash for security
        -- Use both raw_user_meta_data and user_metadata for maximum compatibility
        COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.user_metadata->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.user_metadata->>'last_name', ''),
        CASE
          WHEN NEW.confirmed_at IS NOT NULL THEN 'active'::user_status
          ELSE 'pending_verification'::user_status
        END,
        NEW.confirmed_at,
        -- IMPORTANT FIX: Always use the last_sign_in_at field directly 
        NEW.last_sign_in_at,
        NEW.created_at,
        NEW.updated_at
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, users.last_name),
        status = EXCLUDED.status,
        email_verified_at = EXCLUDED.email_verified_at,
        -- IMPORTANT FIX: Always update last_login_at for INSERT operations
        last_login_at = COALESCE(NEW.last_sign_in_at, users.last_login_at),
        updated_at = NEW.updated_at;
        
      -- Log the insert operation
      INSERT INTO user_sync_audit_logs (user_id, operation, details)
      VALUES (NEW.id, 'insert', jsonb_build_object(
        'email', NEW.email,
        'sync_time', NOW(),
        'has_last_login', (NEW.last_sign_in_at IS NOT NULL)
      ));
      
    ELSIF (TG_OP = 'UPDATE') THEN
      -- Update the existing user
      UPDATE users SET
        email = NEW.email,
        -- Use both raw_user_meta_data and user_metadata for maximum compatibility
        first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.user_metadata->>'first_name', first_name),
        last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.user_metadata->>'last_name', last_name),
        status = CASE
          WHEN NEW.confirmed_at IS NOT NULL THEN 'active'::user_status
          ELSE status
        END,
        email_verified_at = COALESCE(NEW.confirmed_at, email_verified_at),
        -- IMPORTANT FIX: Always update last_login_at even for update operations
        last_login_at = COALESCE(NEW.last_sign_in_at, last_login_at),
        updated_at = NEW.updated_at
      WHERE id = NEW.id;
      
      -- Log the update operation with login status
      INSERT INTO user_sync_audit_logs (user_id, operation, details)
      VALUES (NEW.id, 'update', jsonb_build_object(
        'email', NEW.email,
        'sync_time', NOW(),
        'has_last_login', (NEW.last_sign_in_at IS NOT NULL),
        'old_login_time', (SELECT last_login_at FROM users WHERE id = NEW.id)
      ));
    END IF;
    
    -- Add user-tenant relationship if it doesn't exist
    INSERT INTO user_tenants (user_id, tenant_id, is_primary)
    VALUES (NEW.id, default_tenant_id, true)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't let it propagate to auth system
    sync_error := SQLERRM;
    
    -- Create error log record
    BEGIN
      INSERT INTO user_sync_audit_logs (user_id, operation, details)
      VALUES (NEW.id, 'error', jsonb_build_object(
        'email', NEW.email,
        'sync_time', NOW(),
        'error', sync_error
      ));
    EXCEPTION WHEN OTHERS THEN
      -- Even if logging fails, don't stop auth
      NULL;
    END;
  END;
  
  -- Always return NEW to prevent auth operations from failing
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger on auth.users table with ALL possible names to ensure compatibility
DROP TRIGGER IF EXISTS sync_auth_users_to_users_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS user_sync_trigger ON auth.users;

-- Create with main name used in the application
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user_to_users();

-- Also create with migration-specified name for compatibility
CREATE TRIGGER sync_auth_users_to_users_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user_to_users();

-- Step 3: Create an enhanced manually_sync_user RPC function
CREATE OR REPLACE FUNCTION manually_sync_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  auth_user RECORD;
  app_user RECORD;
  default_tenant_id UUID;
  success BOOLEAN := FALSE;
BEGIN
  -- Get the auth user
  SELECT * INTO auth_user FROM auth.users WHERE id = p_user_id;
  
  IF auth_user.id IS NULL THEN
    RAISE EXCEPTION 'Auth user with ID % not found', p_user_id;
  END IF;
  
  -- Get the default tenant
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  -- If no default tenant exists, create one
  IF default_tenant_id IS NULL THEN
    INSERT INTO tenants(name, slug, status)
    VALUES ('Default Organization', 'default', 'active')
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Check if user exists in application table
  SELECT * INTO app_user FROM users WHERE id = p_user_id;
  
  IF app_user.id IS NULL THEN
    -- Insert new user
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
      -- Use both raw_user_meta_data and user_metadata for maximum compatibility
      COALESCE(auth_user.raw_user_meta_data->>'first_name', auth_user.user_metadata->>'first_name', ''),
      COALESCE(auth_user.raw_user_meta_data->>'last_name', auth_user.user_metadata->>'last_name', ''),
      CASE
        WHEN auth_user.confirmed_at IS NOT NULL THEN 'active'::user_status
        ELSE 'pending_verification'::user_status
      END,
      auth_user.confirmed_at,
      auth_user.last_sign_in_at,
      auth_user.created_at,
      auth_user.updated_at
    );
  ELSE
    -- Update existing user
    UPDATE users SET
      email = auth_user.email,
      -- Use both raw_user_meta_data and user_metadata for maximum compatibility
      first_name = COALESCE(auth_user.raw_user_meta_data->>'first_name', auth_user.user_metadata->>'first_name', app_user.first_name, ''),
      last_name = COALESCE(auth_user.raw_user_meta_data->>'last_name', auth_user.user_metadata->>'last_name', app_user.last_name, ''),
      status = CASE
        WHEN auth_user.confirmed_at IS NOT NULL THEN 'active'::user_status
        ELSE app_user.status
      END,
      email_verified_at = COALESCE(auth_user.confirmed_at, app_user.email_verified_at),
      -- IMPORTANT: Always ensure last_login_at is synced
      last_login_at = COALESCE(auth_user.last_sign_in_at, app_user.last_login_at),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  -- Ensure user-tenant relationship
  INSERT INTO user_tenants (user_id, tenant_id, is_primary)
  VALUES (p_user_id, default_tenant_id, true)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
  
  -- Log the sync operation
  INSERT INTO user_sync_audit_logs (user_id, operation, details)
  VALUES (p_user_id, 'manual_rpc', jsonb_build_object(
    'email', auth_user.email,
    'sync_time', NOW(),
    'source', 'manually_sync_user',
    'has_last_login', (auth_user.last_sign_in_at IS NOT NULL)
  ));
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in manually_sync_user: %', SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create a force sync function for immediate testing
CREATE OR REPLACE FUNCTION force_sync_all_users()
RETURNS INTEGER AS $$
DECLARE
  auth_user RECORD;
  counter INTEGER := 0;
  success BOOLEAN;
BEGIN
  FOR auth_user IN SELECT * FROM auth.users LOOP
    BEGIN
      -- Use the manually_sync_user function for consistency
      success := manually_sync_user(auth_user.id);
      IF success THEN
        counter := counter + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error syncing user %: %', auth_user.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN counter;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
