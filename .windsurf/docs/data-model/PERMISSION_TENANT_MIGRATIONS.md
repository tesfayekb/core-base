
# Permission and Tenant Boundary Migration Strategy

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines the strategy for safely executing database migrations that affect permission structures and tenant boundaries. These migrations require special consideration due to their potential impact on security boundaries and data isolation.

## Critical Migration Types

### 1. Permission-Affecting Migrations

Migrations that modify the permission structure:

- Adding/removing permission types
- Changing permission hierarchies
- Modifying role-permission relationships
- Updating permission resolution logic

### 2. Tenant Boundary-Affecting Migrations

Migrations that modify tenant isolation:

- Adding/removing tenant reference columns
- Changing multi-tenant table structures
- Updating tenant context resolution
- Modifying cross-tenant access patterns

## Migration Safety Principles

### Assessment Phase

Before implementing any migration affecting permissions or tenant boundaries:

1. **Permission Impact Analysis**:
   - Identify all permission types affected
   - Document current vs. planned permission structure
   - Map all code paths using these permissions
   - Identify potential security regressions

2. **Tenant Boundary Analysis**:
   - Identify all tenant boundary changes
   - Document data isolation implications
   - Analyze cross-tenant access patterns
   - Identify potential data leakage risks

3. **Security Review Requirement**:
   - Migrations affecting critical boundaries require security team review
   - Document review findings and mitigations
   - Obtain explicit approval before proceeding

### Implementation Phase

When implementing permission or tenant boundary migrations:

```sql
-- Example: Adding a new permission column with tenant isolation
BEGIN TRANSACTION;

-- 1. Create the new column with default restrictive permissions
ALTER TABLE resource_permissions
ADD COLUMN tenant_specific_restriction BOOLEAN NOT NULL DEFAULT true;

-- 2. Apply temporary RLS to prevent access during migration
ALTER POLICY "resource_access_policy" ON resources
USING (
  (EXISTS (
    SELECT 1 FROM user_effective_permissions uep
    WHERE uep.resource_id = resources.id
    AND uep.user_id = current_setting('app.current_user_id', true)::uuid
    AND (uep.action = 'ViewAny' OR uep.action = 'View')
    -- Temporarily more restrictive during migration
    AND uep.granted = TRUE
    AND uep.migration_safe = TRUE
  ))
);

-- 3. Migrate data with appropriate permissions
UPDATE resource_permissions
SET tenant_specific_restriction = false
WHERE resource_type IN ('public_resource', 'cross_tenant_resource');

-- 4. Update permission resolution functions
CREATE OR REPLACE FUNCTION has_permission(resource_name TEXT, action_name TEXT)
RETURNS BOOLEAN AS $$
  -- Updated implementation considering tenant boundaries
  -- ...
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Restore original RLS behavior with new condition
ALTER POLICY "resource_access_policy" ON resources
USING (
  (EXISTS (
    SELECT 1 FROM user_effective_permissions uep
    WHERE uep.resource_id = resources.id
    AND uep.user_id = current_setting('app.current_user_id', true)::uuid
    AND (uep.action = 'ViewAny' OR uep.action = 'View')
    AND uep.granted = TRUE
    -- Include new tenant boundary check
    AND (NOT uep.tenant_specific_restriction OR 
         uep.tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  ))
);

COMMIT;
```

### Testing Phase

Comprehensive testing for permission/tenant boundary migrations:

1. **Permission Test Matrix**:
   - Test each affected permission type
   - Verify permission resolution works correctly
   - Confirm no unintended permission escalation
   - Validate permission inheritance patterns

2. **Tenant Boundary Tests**:
   - Verify tenant data isolation is maintained
   - Test cross-tenant access with explicit permissions
   - Confirm tenant context switching behaves correctly
   - Validate that users cannot access unauthorized tenants

3. **Security Regression Testing**:
   - Run automated security tests
   - Perform manual security review
   - Test edge cases for permission bypass
   - Validate RLS policies are correctly applied

### Deployment Strategy

Safely deploying permission/tenant boundary migrations:

1. **Phased Rollout**:
   - Deploy to development environment
   - Validate thoroughly in staging
   - Consider canary deployment to subset of production
   - Monitor for security anomalies

2. **Rollback Plan**:
   - Document specific rollback steps
   - Prepare rollback scripts
   - Define objective criteria for rollback decision
   - Assign rollback responsibility

3. **Permission Transition Period**:
   - Consider dual permission models during transition
   - Temporarily grant both old and new permissions
   - Log permission resolution decisions for analysis
   - Remove legacy permission model after stability period

## Implementation Patterns

### Permission Migration Patterns

#### 1. Safe Permission Addition

Adding new permissions without disrupting existing access:

```sql
-- Step 1: Create new permission type
INSERT INTO public.permissions (action, resource_id)
VALUES ('NewAction', (SELECT id FROM resources WHERE name = 'target_resource'));

-- Step 2: Associate with appropriate roles
WITH new_perm AS (
  SELECT id FROM permissions 
  WHERE action = 'NewAction' 
  AND resource_id = (SELECT id FROM resources WHERE name = 'target_resource')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, np.id
FROM roles r, new_perm np
WHERE r.name IN ('admin', 'manager');
```

#### 2. Safe Permission Replacement

Replacing a permission type with minimal disruption:

```sql
BEGIN TRANSACTION;

-- Step 1: Create new permission
INSERT INTO public.permissions (action, resource_id)
VALUES ('ImprovedAction', (SELECT id FROM resources WHERE name = 'target_resource'));

-- Step 2: Identify roles with old permission
WITH roles_with_old_perm AS (
  SELECT DISTINCT rp.role_id
  FROM role_permissions rp
  JOIN permissions p ON rp.permission_id = p.id
  WHERE p.action = 'OldAction'
  AND p.resource_id = (SELECT id FROM resources WHERE name = 'target_resource')
)

-- Step 3: Grant new permission to those roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT rwop.role_id, p.id
FROM roles_with_old_perm rwop
CROSS JOIN (
  SELECT id FROM permissions 
  WHERE action = 'ImprovedAction'
  AND resource_id = (SELECT id FROM resources WHERE name = 'target_resource')
) p;

-- Step 4: Verify and log transition
INSERT INTO permission_transition_logs (
  old_permission_id, new_permission_id, migrated_at, migration_version
)
SELECT 
  old_p.id, new_p.id, NOW(), '005_replace_old_action'
FROM permissions old_p
CROSS JOIN permissions new_p
WHERE old_p.action = 'OldAction'
AND new_p.action = 'ImprovedAction'
AND old_p.resource_id = new_p.resource_id;

-- Step 5: Remove old permission grants (after transition period)
-- Commented out initially, uncomment after transition period
/* 
DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions
  WHERE action = 'OldAction'
  AND resource_id = (SELECT id FROM resources WHERE name = 'target_resource')
);
*/

COMMIT;
```

### Tenant Boundary Migration Patterns

#### 1. Adding Tenant Context to Existing Table

Adding tenant isolation to a previously non-tenant-aware table:

```sql
BEGIN TRANSACTION;

-- Step 1: Add tenant_id column
ALTER TABLE resource_data
ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Step 2: Populate based on owner's tenant
UPDATE resource_data rd
SET tenant_id = (
  SELECT ut.tenant_id 
  FROM user_tenants ut
  WHERE ut.user_id = rd.owner_id
  ORDER BY ut.is_default DESC
  LIMIT 1
);

-- Step 3: Make column NOT NULL after populating
ALTER TABLE resource_data
ALTER COLUMN tenant_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX idx_resource_data_tenant_id ON resource_data(tenant_id);

-- Step 5: Add tenant RLS policy
ALTER TABLE resource_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON resource_data
USING (
  tenant_id = current_setting('app.current_tenant_id', true)::uuid
);

-- Step 6: Add foreign key constraint
ALTER TABLE resource_data
ADD CONSTRAINT fk_resource_data_tenant
FOREIGN KEY (tenant_id) REFERENCES tenants(id)
ON DELETE CASCADE;

COMMIT;
```

#### 2. Converting Single-Tenant to Multi-Tenant Function

Updating a function to support tenant context:

```sql
CREATE OR REPLACE FUNCTION get_resource_data(resource_id UUID)
RETURNS TABLE (id UUID, name TEXT, data JSONB) AS $$
BEGIN
  -- Previous non-tenant-aware version:
  -- RETURN QUERY SELECT rd.id, rd.name, rd.data FROM resource_data rd WHERE rd.id = resource_id;
  
  -- New tenant-aware version:
  RETURN QUERY 
  SELECT rd.id, rd.name, rd.data 
  FROM resource_data rd 
  WHERE rd.id = resource_id
  AND rd.tenant_id = current_setting('app.current_tenant_id', true)::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Rollback Procedures

### Permission Rollback

If a permission migration needs to be rolled back:

1. **Restore Previous Permission Grants**:

```sql
-- Restore original permission assignments from backup table
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM permission_backup_005
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = permission_backup_005.role_id
  AND rp.permission_id = permission_backup_005.permission_id
);
```

2. **Update Permission Resolution Function**:

```sql
-- Restore previous version of function
CREATE OR REPLACE FUNCTION has_permission(resource_name TEXT, action_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Previous implementation
  -- ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Tenant Boundary Rollback

For tenant boundary migrations requiring rollback:

1. **Rollback Schema Changes**:

```sql
-- Step 1: Disable constraints
ALTER TABLE resource_data
DROP CONSTRAINT fk_resource_data_tenant;

-- Step 2: Remove RLS policy
DROP POLICY tenant_isolation_policy ON resource_data;

-- Step 3: Make column nullable for transition
ALTER TABLE resource_data
ALTER COLUMN tenant_id DROP NOT NULL;

-- Step 4: Restore previous function behavior
CREATE OR REPLACE FUNCTION get_resource_data(resource_id UUID)
RETURNS TABLE (id UUID, name TEXT, data JSONB) AS $$
BEGIN
  RETURN QUERY 
  SELECT rd.id, rd.name, rd.data 
  FROM resource_data rd 
  WHERE rd.id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Migration Documentation Requirements

Each permission or tenant boundary migration must include:

1. **Security Impact Assessment**:
   - Document security boundaries before and after
   - List all permission types affected
   - Document any temporary permission state
   - Note any potential security implications

2. **Testing Report**:
   - Document test cases executed
   - Provide results of permission matrix testing
   - Include tenant boundary test results
   - Document any edge cases or known limitations

3. **Rollback Procedure**:
   - Include step-by-step rollback instructions
   - List all objects that would need rollback
   - Provide specific SQL for rollback
   - Include verification steps after rollback

## Related Documentation

- **[SCHEMA_MIGRATIONS.md](SCHEMA_MIGRATIONS.md)**: General migration procedures
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**: Schema definitions and structures
- **[ENTITY_RELATIONSHIPS](entity-relationships/README.md)**: Entity-relationship documentation
- **[../rbac/PERMISSION_TYPES.md](../rbac/PERMISSION_TYPES.md)**: Permission taxonomy
- **[../multitenancy/DATA_ISOLATION.md](../multitenancy/DATA_ISOLATION.md)**: Tenant data isolation principles

## Version History

- **1.0.0**: Initial permission and tenant boundary migration strategy (2025-05-22)
