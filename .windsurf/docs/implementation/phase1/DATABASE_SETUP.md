
# Database Schema Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Step-by-step guide for implementing the database schema with a focus on multi-tenant support.

## Implementation Steps

### Step 1: Create Core Tables

```sql
-- Step 1: Create tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Create users table extension
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Step 3: Create roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);
```

### Step 2: Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "tenant_isolation" ON tenants
  FOR ALL USING (id = get_current_tenant_id());

CREATE POLICY "role_tenant_isolation" ON roles
  FOR ALL USING (tenant_id = get_current_tenant_id());
```

### Step 3: Create Database Functions

```sql
-- Tenant context function
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.tenant_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Set tenant context function
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;
```

## Validation Steps

### Verify Table Creation

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'roles');
```

### Test RLS Policies

```sql
-- Test tenant isolation
SELECT set_tenant_context('00000000-0000-0000-0000-000000000000');
SELECT * FROM tenants; -- Should return empty or filtered results
```

### Validate Functions

```sql
-- Test tenant context functions
SELECT set_tenant_context('test-tenant-id');
SELECT get_current_tenant_id();
```

## Common Issues & Solutions

**Issue**: Table creation fails due to missing extensions
```sql
-- Solution: Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

**Issue**: RLS policies not working
```sql
-- Solution: Check policy definitions and tenant context
SELECT * FROM pg_policies WHERE tablename = 'tenants';
SELECT current_setting('app.tenant_id', true);
```

## Next Steps

- Proceed to [AUTHENTICATION.md](AUTHENTICATION.md) for authentication implementation
- Review [../testing/DATABASE_TESTING.md](../testing/DATABASE_TESTING.md) for database testing

## Version History

- **1.0.0**: Initial database implementation guide (2025-05-23)
