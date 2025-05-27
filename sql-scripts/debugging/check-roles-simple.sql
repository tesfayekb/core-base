-- Simple queries to check user roles - run these one by one

-- 1. Check if user exists
SELECT id, email, first_name, last_name, status
FROM users 
WHERE email = 'bethany@bethany.com';

-- 2. Check tenants
SELECT id, name, slug, status 
FROM tenants;

-- 3. Check if SuperAdmin role exists
SELECT * FROM roles WHERE name = 'SuperAdmin';

-- 4. Check user's tenant membership
SELECT * FROM user_tenants 
WHERE user_id IN (SELECT id FROM users WHERE email = 'bethany@bethany.com');

-- 5. Check user role assignments (without ordering)
SELECT 
    ur.*,
    u.email,
    r.name as role_name,
    t.name as tenant_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
JOIN tenants t ON ur.tenant_id = t.id;

-- 6. Check columns in user_roles table to see what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY ordinal_position;

-- 7. If no SuperAdmin role exists, check what roles do exist
SELECT DISTINCT name FROM roles;
