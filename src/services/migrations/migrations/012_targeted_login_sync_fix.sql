
-- Targeted Fix: Synchronize last_login_at field between auth.users and users tables
-- This script will fix the login time mismatch identified in the diagnostic

-- Step 1: Update the manually_sync_user function to ensure proper last_login_at sync
CREATE OR REPLACE FUNCTION public.manually_sync_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    -- Insert new user with proper last_login_at sync
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
      COALESCE(auth_user.raw_user_meta_data->>'first_name', auth_user.user_metadata->>'first_name', ''),
      COALESCE(auth_user.raw_user_meta_data->>'last_name', auth_user.user_metadata->>'last_name', ''),
      CASE
        WHEN auth_user.confirmed_at IS NOT NULL THEN 'active'::user_status
        ELSE 'pending_verification'::user_status
      END,
      auth_user.confirmed_at,
      auth_user.last_sign_in_at, -- CRITICAL: Direct assignment
      auth_user.created_at,
      auth_user.updated_at
    );
  ELSE
    -- Update existing user with corrected last_login_at sync
    UPDATE users SET
      email = auth_user.email,
      first_name = COALESCE(auth_user.raw_user_meta_data->>'first_name', auth_user.user_metadata->>'first_name', app_user.first_name, ''),
      last_name = COALESCE(auth_user.raw_user_meta_data->>'last_name', auth_user.user_metadata->>'last_name', app_user.last_name, ''),
      status = CASE
        WHEN auth_user.confirmed_at IS NOT NULL THEN 'active'::user_status
        ELSE app_user.status
      END,
      email_verified_at = COALESCE(auth_user.confirmed_at, app_user.email_verified_at),
      -- CRITICAL FIX: Force update last_login_at to match auth.users exactly
      last_login_at = auth_user.last_sign_in_at,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  -- Ensure user-tenant relationship
  INSERT INTO user_tenants (user_id, tenant_id, is_primary)
  VALUES (p_user_id, default_tenant_id, true)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
  
  -- Log the sync operation
  INSERT INTO user_sync_audit_logs (user_id, operation, details)
  VALUES (p_user_id, 'targeted_login_fix', jsonb_build_object(
    'email', auth_user.email,
    'sync_time', NOW(),
    'source', 'manually_sync_user_fixed',
    'auth_last_sign_in', auth_user.last_sign_in_at,
    'before_fix', (SELECT last_login_at FROM users WHERE id = p_user_id)
  ));
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in manually_sync_user: %', SQLERRM;
  RETURN FALSE;
END;
$function$;

-- Step 2: Update the trigger function to ensure proper last_login_at sync
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_users()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
        COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.user_metadata->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.user_metadata->>'last_name', ''),
        CASE
          WHEN NEW.confirmed_at IS NOT NULL THEN 'active'::user_status
          ELSE 'pending_verification'::user_status
        END,
        NEW.confirmed_at,
        -- CRITICAL FIX: Direct assignment of last_sign_in_at
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
        -- CRITICAL FIX: Always update last_login_at to match auth exactly
        last_login_at = NEW.last_sign_in_at,
        updated_at = NEW.updated_at;
        
      -- Log the insert operation
      INSERT INTO user_sync_audit_logs (user_id, operation, details)
      VALUES (NEW.id, 'insert_fixed', jsonb_build_object(
        'email', NEW.email,
        'sync_time', NOW(),
        'last_sign_in_at', NEW.last_sign_in_at
      ));
      
    ELSIF (TG_OP = 'UPDATE') THEN
      -- Update the existing user
      UPDATE users SET
        email = NEW.email,
        first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.user_metadata->>'first_name', first_name),
        last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.user_metadata->>'last_name', last_name),
        status = CASE
          WHEN NEW.confirmed_at IS NOT NULL THEN 'active'::user_status
          ELSE status
        END,
        email_verified_at = COALESCE(NEW.confirmed_at, email_verified_at),
        -- CRITICAL FIX: Always sync last_login_at exactly
        last_login_at = NEW.last_sign_in_at,
        updated_at = NEW.updated_at
      WHERE id = NEW.id;
      
      -- Log the update operation
      INSERT INTO user_sync_audit_logs (user_id, operation, details)
      VALUES (NEW.id, 'update_fixed', jsonb_build_object(
        'email', NEW.email,
        'sync_time', NOW(),
        'last_sign_in_at', NEW.last_sign_in_at
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
      VALUES (NEW.id, 'error_fixed', jsonb_build_object(
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
$function$;

-- Step 3: Force sync all existing users to fix the mismatch
SELECT manually_sync_user(id) FROM auth.users;

-- Step 4: Verify the fix by checking for any remaining mismatches
SELECT 
  'Fix Verification' AS status,
  COUNT(*) AS total_users,
  COUNT(CASE WHEN au.last_sign_in_at != u.last_login_at THEN 1 END) AS remaining_mismatches
FROM auth.users au
JOIN users u ON au.id = u.id;
