
# Database Migration Log

> **Version**: 1.3.0  
> **Last Updated**: 2025-06-03

## Overview

This document tracks all database migrations applied to the system, including manual fixes and schema updates.

## Migration History

### Migration 013: Fix SuperAdmin Role Tenant Constraints
**Date**: 2025-06-03  
**Status**: Applied  
**Purpose**: Fix SuperAdmin role structure and enforce system role access controls

**Changes Made**:
- Removed NOT NULL constraint from `roles.tenant_id` column
- Updated existing SuperAdmin roles to have NULL `tenant_id` (making them system-wide)
- Added check constraint to ensure only system roles can have NULL `tenant_id`
- Created `is_current_user_superadmin()` function for permission checking
- Created `enforce_system_role_access()` trigger function
- Added trigger to prevent non-SuperAdmins from managing system roles

**Files**:
- `src/services/migrations/migrations/013_fix_superadmin_role_tenant_constraints.ts`
- `src/services/migrations/migrations/014_record_migration_013.sql`

**Database Functions Added**:
- `is_current_user_superadmin()`: Checks if current user has SuperAdmin role
- `enforce_system_role_access()`: Trigger function to protect system role operations

**Triggers Added**:
- `system_role_access_trigger`: Enforces SuperAdmin-only access to system roles

### Migration 012: Targeted Login Sync Fix
**Date**: 2025-01-27  
**Status**: Applied  
**Purpose**: Fix synchronization of last_login_at field between auth.users and users tables

### Migration 011: Fix Tenant Associations
**Date**: 2025-01-27  
**Status**: Applied  
**Purpose**: Ensure all users are properly associated with default tenant

### Migration 010: Force User Sync with Audit Logs
**Date**: 2025-01-27  
**Status**: Applied  
**Purpose**: Force synchronization of all users with comprehensive audit logging

## System Role Management

### Current System Roles
- **SuperAdmin**: System-wide administrator with full access (tenant_id = NULL)

### Access Control Rules
1. Only system roles can have `tenant_id = NULL`
2. Only SuperAdmins can create, update, or delete system roles
3. Regular tenant roles must have a valid `tenant_id`

### Database Constraints
- `roles_tenant_id_system_check`: Ensures proper tenant_id assignment based on role type
- `system_role_access_trigger`: Enforces SuperAdmin-only access to system roles

## Troubleshooting

### Common Issues

1. **SuperAdmin Role Has Tenant ID**
   - **Symptom**: SuperAdmin role shows a tenant_id value
   - **Solution**: Run migration 013 to fix the constraint and update the role

2. **Cannot Create System Roles**
   - **Symptom**: Error when trying to create roles with `is_system_role = true`
   - **Cause**: User lacks SuperAdmin privileges
   - **Solution**: Ensure user has SuperAdmin role assignment

3. **Tenant Constraint Violations**
   - **Symptom**: Errors when updating roles
   - **Cause**: Violation of tenant_id constraints
   - **Solution**: Check that system roles have NULL tenant_id and regular roles have valid tenant_id

## Related Documentation

- **[SCHEMA_MIGRATIONS.md](SCHEMA_MIGRATIONS.md)**: Complete migration management guide
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**: Current database schema
- **[../rbac/ROLE_ARCHITECTURE.md](../rbac/ROLE_ARCHITECTURE.md)**: Role-based access control architecture

## Version History

- **1.3.0**: Added migration 013 documentation for SuperAdmin role fixes (2025-06-03)
- **1.2.0**: Added comprehensive migration tracking (2025-01-27)
- **1.1.0**: Initial migration log structure (2025-01-27)
- **1.0.0**: Document creation (2025-01-27)
