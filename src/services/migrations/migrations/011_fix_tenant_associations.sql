
-- Fix tenant association for all users
-- This script ensures all users are properly associated with the default tenant

-- Step 1: First, get a list of users and their tenant associations
SELECT 
  u.id,
  u.email,
  u.tenant_id,
  t.name AS tenant_name,
  u.status,
  EXISTS(
    SELECT 1 FROM user_tenants ut 
    WHERE ut.user_id = u.id AND ut.tenant_id = u.tenant_id
  ) AS has_tenant_association
FROM 
  users u
LEFT JOIN 
  tenants t ON u.tenant_id = t.id;

-- Step 2: Ensure default tenant exists
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get the default tenant ID
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
END $$;

-- Step 3: Insert missing user-tenant associations
DO $$
DECLARE
  user_rec RECORD;
  default_tenant_id UUID;
  has_status BOOLEAN;
BEGIN
  -- Get default tenant ID
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  
  -- Check if status column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_tenants' 
    AND column_name = 'status'
  ) INTO has_status;
  
  -- Process each user
  FOR user_rec IN SELECT * FROM users LOOP
    -- Log what we're doing
    RAISE NOTICE 'Processing user % (ID: %)', user_rec.email, user_rec.id;
    
    -- Check if user already has association with default tenant
    IF NOT EXISTS (
      SELECT 1 FROM user_tenants 
      WHERE user_id = user_rec.id 
      AND tenant_id = default_tenant_id
    ) THEN
      -- Insert the association using dynamic SQL based on schema structure
      IF has_status THEN
        EXECUTE 'INSERT INTO user_tenants (user_id, tenant_id, status, is_primary) 
                VALUES ($1, $2, $3, $4) 
                ON CONFLICT (tenant_id, user_id) DO NOTHING'
        USING user_rec.id, default_tenant_id, 'active', TRUE;
      ELSE
        EXECUTE 'INSERT INTO user_tenants (user_id, tenant_id, is_primary) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (tenant_id, user_id) DO NOTHING'
        USING user_rec.id, default_tenant_id, TRUE;
      END IF;
      
      RAISE NOTICE 'Added tenant association for user %', user_rec.email;
    ELSE
      RAISE NOTICE 'User % already has association with default tenant', user_rec.email;
    END IF;
    
    -- Also ensure the user's tenant_id in users table is set to default tenant
    IF user_rec.tenant_id IS NULL OR user_rec.tenant_id != default_tenant_id THEN
      UPDATE users SET tenant_id = default_tenant_id WHERE id = user_rec.id;
      RAISE NOTICE 'Updated tenant_id for user %', user_rec.email;
    END IF;
  END LOOP;
END $$;

-- Step 4: Verify all users have tenant associations
SELECT 
  u.id,
  u.email,
  u.tenant_id,
  t.name AS tenant_name,
  EXISTS(
    SELECT 1 FROM user_tenants ut 
    WHERE ut.user_id = u.id AND ut.tenant_id = u.tenant_id
  ) AS has_tenant_association,
  (
    SELECT COUNT(*) FROM user_tenants ut 
    WHERE ut.user_id = u.id
  ) AS total_tenant_associations
FROM 
  users u
LEFT JOIN 
  tenants t ON u.tenant_id = t.id
ORDER BY 
  has_tenant_association, u.email;

