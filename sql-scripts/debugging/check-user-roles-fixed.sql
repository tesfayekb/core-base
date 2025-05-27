-- Check user roles and tenant assignments
-- Run these queries one by one in Supabase SQL Editor

-- 1. Check all users
SELECT id, email, first_name, last_name, status, created_at
FROM users
ORDER BY created_at DESC;

-- 2. Check all tenants
SELECT id, name, slug, status, created_at
FROM tenants
ORDER BY created_at DESC;

-- 3. Check user-tenant relationships (simple version)
SELECT ut.*, u.email, t.name as tenant_name
FROM user_tenants ut
JOIN users u ON ut.user_id = u.id
JOIN tenants t ON ut.tenant_id = t.id;

-- 4. Check all roles
SELECT r.*, t.name as tenant_name
FROM roles r
JOIN tenants t ON r.tenant_id = t.id
ORDER BY r.created_at DESC;

-- 5. Check user role assignments
SELECT 
    ur.*,
    u.email,
    r.name as role_name,
    t.name as tenant_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
JOIN tenants t ON ur.tenant_id = t.id
ORDER BY ur.created_at DESC;

-- 6. Get complete user profile with roles for specific email
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    t.name as tenant_name,
    r.name as role_name,
    r.is_system_role
FROM users u
LEFT JOIN user_tenants ut ON u.id = ut.user_id
LEFT JOIN tenants t ON ut.tenant_id = t.id
LEFT JOIN user_roles ur ON u.id = ur.user_id AND t.id = ur.tenant_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'bethany@bethany.com';  -- Replace with your email

-- 7. Check if SuperAdmin role exists for any tenant
SELECT * FROM roles WHERE name = 'SuperAdmin';

-- 8. Check columns in user_tenants table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_tenants' 
ORDER BY ordinal_position;
