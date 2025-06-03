
-- Verification script to check user data synchronization
-- Run this in the Supabase SQL Editor to see if auth.users data matches users table

-- Get a detailed comparison view
SELECT 
  au.id,
  au.email,
  -- Auth user name data
  au.raw_user_meta_data->>'first_name' AS auth_first_name,
  au.raw_user_meta_data->>'last_name' AS auth_last_name,
  -- App user name data
  u.first_name AS app_first_name,
  u.last_name AS app_last_name,
  -- Authentication status
  au.confirmed_at AS auth_confirmed_at,
  u.email_verified_at AS app_email_verified_at,
  -- Last login timestamps
  au.last_sign_in_at AS auth_last_sign_in_at,
  u.last_login_at AS app_last_login_at,
  -- Status check
  au.confirmed_at IS NOT NULL AS auth_is_confirmed,
  u.status AS app_status,
  -- Creation dates
  au.created_at AS auth_created_at,
  u.created_at AS app_created_at,
  -- Analysis
  CASE WHEN u.last_login_at = au.last_sign_in_at THEN '✓' ELSE '✗' END AS login_time_match,
  CASE WHEN u.first_name = au.raw_user_meta_data->>'first_name' THEN '✓' ELSE '✗' END AS first_name_match,
  CASE WHEN u.last_name = au.raw_user_meta_data->>'last_name' THEN '✓' ELSE '✗' END AS last_name_match
FROM 
  auth.users au
LEFT JOIN 
  users u ON au.id = u.id
ORDER BY 
  au.email;

-- Summarize sync issues
SELECT 
  COUNT(*) AS total_users,
  SUM(CASE WHEN u.id IS NULL THEN 1 ELSE 0 END) AS missing_in_app_table,
  SUM(CASE WHEN u.last_login_at != au.last_sign_in_at THEN 1 ELSE 0 END) AS login_time_mismatch,
  SUM(CASE WHEN u.first_name != COALESCE(au.raw_user_meta_data->>'first_name', '') THEN 1 ELSE 0 END) AS first_name_mismatch,
  SUM(CASE WHEN u.last_name != COALESCE(au.raw_user_meta_data->>'last_name', '') THEN 1 ELSE 0 END) AS last_name_mismatch
FROM 
  auth.users au
LEFT JOIN 
  users u ON au.id = u.id;

-- Force sync all users again to resolve any remaining issues
DO $$
BEGIN
  PERFORM manually_sync_user(id) FROM auth.users;
END $$;

-- Run the summary again to confirm fixes
SELECT 
  COUNT(*) AS total_users,
  SUM(CASE WHEN u.id IS NULL THEN 1 ELSE 0 END) AS missing_in_app_table,
  SUM(CASE WHEN u.last_login_at != au.last_sign_in_at THEN 1 ELSE 0 END) AS login_time_mismatch,
  SUM(CASE WHEN u.first_name != COALESCE(au.raw_user_meta_data->>'first_name', '') THEN 1 ELSE 0 END) AS first_name_mismatch,
  SUM(CASE WHEN u.last_name != COALESCE(au.raw_user_meta_data->>'last_name', '') THEN 1 ELSE 0 END) AS last_name_mismatch
FROM 
  auth.users au
LEFT JOIN 
  users u ON au.id = u.id;
