# Schema Migrations Documentation

> **Version**: 1.2.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the guidelines and best practices for managing schema migrations, including versioning, deployment, and rollback procedures.

## Migration Management System

### Migration File Structure

All migrations follow this naming convention:
```
[sequence_number]_[descriptive_name].sql
```

Example:
```
001_create_users_table.sql
002_add_email_index.sql
003_create_roles_tables.sql
```

### Migration Tracking Table

Migrations are tracked in a dedicated migrations table:

```sql
CREATE TABLE migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version CHARACTER VARYING NOT NULL,
  name CHARACTER VARYING NOT NULL,
  script TEXT NOT NULL,
  hash CHARACTER VARYING NOT NULL,
  applied_by CHARACTER VARYING,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

This table records:
- Unique migration identifier
- Version number
- Migration name
- Complete SQL script
- Hash of the script (for integrity verification)
- User who applied the migration
- Timestamp when applied

## Migration Process

### Development Workflow

1. **Migration Creation**:
   - Create a new SQL file in the `/migrations/pending` directory
   - Follow the naming convention: `[sequence_number]_[descriptive_name].sql`
   - Include both `UP` and `DOWN` sections for forward and rollback operations

2. **Migration Testing**:
   - Test the migration against a development database
   - Verify both the `UP` and `DOWN` scripts work correctly
   - Ensure idempotency (can be run multiple times without error)

3. **Migration Review**:
   - Submit the migration for peer review
   - Ensure it follows database standards
   - Verify it includes proper comments and documentation
   - Check that it doesn't violate any constraints or data integrity rules

4. **Migration Approval**:
   - Once approved, the migration can be applied to staging environments
   - Migrations are moved from `/migrations/pending` to `/migrations/applied` after successful deployment

### Migration Application

The migration runner performs these steps for each migration:

1. Check if migration has already been applied (by checking the migrations table)
2. Begin transaction
3. Execute the migration script
4. Record the migration in the migrations table
5. Commit transaction

Example function to apply a migration:

```sql
CREATE OR REPLACE FUNCTION apply_migration(
  p_version VARCHAR, 
  p_name VARCHAR, 
  p_script TEXT, 
  p_applied_by VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  script_hash VARCHAR;
BEGIN
  -- Calculate hash of the script
  SELECT md5(p_script) INTO script_hash;
  
  -- Execute the migration script
  EXECUTE p_script;
  
  -- Record the migration
  INSERT INTO migrations (version, name, script, hash, applied_by)
  VALUES (p_version, p_name, p_script, script_hash, p_applied_by);
  
  RAISE NOTICE 'Migration % % applied successfully', p_version, p_name;
END;
$$;
```

### Rollback Procedure

1. **Single Migration Rollback**:
   - Identify the migration to roll back
   - Execute the `DOWN` section of the migration script
   - Remove the migration record from the migrations table

2. **Multiple Migration Rollback**:
   - Identify the target version to roll back to
   - Execute rollbacks in reverse chronological order
   - Remove corresponding records from the migrations table

## Migration Types

### 1. Schema Changes

Migrations that modify the database structure:

- Table creation/modification/deletion
- Index creation/deletion
- Constraint addition/removal
- Column additions/modifications

```sql
-- Example schema change migration
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
```

### 2. Data Migrations

Migrations that manipulate existing data:

- Data transformations
- Data normalization
- Backfilling new columns

```sql
-- Example data migration
UPDATE profiles
SET full_name = first_name || ' ' || last_name
WHERE full_name IS NULL AND first_name IS NOT NULL AND last_name IS NOT NULL;
```

### 3. Function and Procedure Updates

Migrations that add or modify database functions:

- Function creation/modification
- Stored procedure updates
- Trigger implementation

```sql
-- Example function migration
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TABLE(resource_name TEXT, action TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT r.name, p.action
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  JOIN resources r ON p.resource_id = r.id
  WHERE ur.user_id = user_id;
$$;
```

### 4. Security Boundary Migrations

Migrations that affect permission structures or tenant boundaries require special handling. These include:

- Adding/modifying permission types
- Changing role-permission relationships
- Adding tenant isolation to existing tables
- Modifying tenant boundary validations

For detailed guidance on security boundary migrations, see [PERMISSION_TENANT_MIGRATIONS.md](PERMISSION_TENANT_MIGRATIONS.md).

### 5. RLS Policy Migrations

Migrations that modify Row-Level Security (RLS) policies:

- Creating or updating RLS policies for tables
- Modifying RLS policy definitions
- Adding or removing RLS policy exceptions

Example of an RLS policy migration:

### Migration 006: Create Utility Functions
**Date**: 2025-01-27  
**Purpose**: Add database utility functions for permission checking and common operations

**Functions Added**:
1. **check_user_permission()**:
   - Checks if user has specific permission on a resource
   - Considers both direct user permissions and role-based permissions
   - Validates against current tenant context

2. **get_user_roles()**:
   - Returns all roles for a user in current tenant
   - Includes role metadata and system role flag

3. **ensure_superadmin_exists()**:
   - Creates SuperAdmin role if it doesn't exist
   - Ensures at least one user has SuperAdmin role
   - Used during initial tenant setup

4. **get_tenant_users()**:
   - Returns all users in a tenant with their roles
   - Includes user status and last login information

**Migration File**: `src/services/migrations/migrations/006_create_utility_functions.ts`

### Migration 007: Fix RLS Policies for Initial Setup
**Date**: 2025-01-27  
**Purpose**: Resolve RLS policy conflicts that prevent initial tenant creation

**Problem Addressed**:
- New users were unable to create initial tenants due to restrictive RLS policies
- Error: "new row violates row-level security policy for table 'tenants'"
- Chicken-and-egg problem: users need tenant membership to create tenants

**Changes Made**:
1. **Tenants Table**:
   - Added policy allowing authenticated users to create tenants
   - Maintained view/update restrictions to tenant members only

2. **User_tenants Table**:
   - Allowed users to create their own memberships
   - Restricted viewing to own memberships only

3. **Users Table**:
   - Allowed users to insert their own profile
   - Simplified view policy for initial setup
   - Maintained self-update restriction

4. **Roles and User_roles Tables**:
   - Temporarily relaxed policies for initial setup
   - Should be refined for production use

**Important Notes**:
- These policies are simplified for development/initial setup
- Production deployments should implement more restrictive policies
- Consider implementing a proper onboarding flow that creates initial data server-side

**Migration File**: `src/services/migrations/migrations/007_fix_rls_policies_for_initial_setup.ts`

## Migration Best Practices

1. **Idempotency**:
   - Migrations should be idempotent (can run multiple times without error)
   - Use `CREATE TABLE IF NOT EXISTS`, `DO $$` blocks with conditionals

2. **Transaction Safety**:
   - Wrap migrations in transactions to ensure atomicity
   - Handle complex migrations with multiple steps carefully

3. **Backward Compatibility**:
   - Ensure schema changes maintain backward compatibility when possible
   - Split breaking changes into multiple migrations when needed

4. **Performance Considerations**:
   - Consider table size when adding indexes or constraints
   - Use batching for large data migrations
   - Schedule resource-intensive migrations during low-traffic periods

5. **Documentation**:
   - Include clear comments explaining the purpose of the migration
   - Document any manual steps required along with the migration

6. **Security Boundary Awareness**:
   - Identify migrations that affect permissions or tenant boundaries
   - Follow the dedicated process for security-sensitive migrations
   - Include security impact assessment for such changes

## Related Documentation

- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**: Schema definitions and table structures
- **[ENTITY_RELATIONSHIPS.md](ENTITY_RELATIONSHIPS.md)**: Entity-relationship diagrams and documentation
- **[DATA_INTEGRITY.md](DATA_INTEGRITY.md)**: Integrity constraints and validation rules
- **[PERMISSION_TENANT_MIGRATIONS.md](PERMISSION_TENANT_MIGRATIONS.md)**: Specific guidance for permission and tenant boundary migrations
- **[../SCHEMA_MANAGEMENT.md](../SCHEMA_MANAGEMENT.md)**: Overall schema management principles

## Version History

- **1.2.0**: Added reference to permission and tenant boundary migration strategy (2025-05-22)
- **1.1.0**: Added comprehensive migration guidelines (2025-05-22)
- **1.0.0**: Initial placeholder document (2025-05-22)
