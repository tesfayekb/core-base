
# Migration History and Tracking

## Overview

This document tracks all database migrations applied to the Core Base system, their status, and important notes about each migration.

## Migration Status

Last Updated: 2025-06-03

| Version | Name | Date Applied | Status | Notes |
|---------|------|--------------|--------|-------|
| 000 | migration_infrastructure | 2025-01-26 | ✅ Applied | Sets up migration tracking table |
| 001 | create_core_schema | 2025-01-26 | ✅ Applied | Core tables: users, tenants, user_tenants |
| 002 | create_rbac_tables | 2025-01-26 | ✅ Applied | RBAC tables: roles, permissions, user_roles |
| 003 | create_audit_session_tables | 2025-01-26 | ✅ Applied | Audit logs and session management |
| 003 | create_database_functions | 2025-01-26 | ✅ Applied | Core database functions |
| 004 | create_indexes | 2025-01-26 | ✅ Applied | Performance indexes on key tables |
| 005 | enable_rls_policies | 2025-01-26 | ✅ Applied | Initial RLS policies (had issues) |
| 006 | create_utility_functions | 2025-01-27 | ✅ Applied | Permission checking and utility functions |
| 007 | fix_rls_policies_for_initial_setup | 2025-01-27 | ✅ Applied | **CRITICAL FIX** - Resolves initial tenant creation |
| 008 | enhanced_user_synchronization | 2025-06-03 | ✅ Applied | **CRITICAL FIX** - User sync between auth.users and custom users table |
| 009 | user_sync_verification_and_audit | 2025-06-03 | ✅ Applied | Verification and audit logging for user synchronization |
| 010 | force_user_sync_with_audit_logs | 2025-06-03 | ✅ Applied | Final fix for missing users and comprehensive audit logging |
| 011 | fix_tenant_associations | 2025-06-03 | ✅ Applied | **CRITICAL FIX** - Ensures all users have proper tenant associations |

## Critical Migrations

### Migration 007: RLS Policy Fix
- **Problem**: Users could not create initial tenants due to restrictive RLS policies
- **Solution**: Relaxed policies to allow authenticated users to create initial data
- **Impact**: Essential for new user onboarding
- **Future Work**: Implement server-side tenant creation for production

### Migration 008: Enhanced User Synchronization
- **Problem**: User data not syncing properly between auth.users and custom users table
- **Solution**: Created enhanced sync functions with proper field mapping
- **Impact**: Fixes null last_login_at and name synchronization issues
- **Key Features**:
  - Proper mapping from auth.users metadata to users table
  - Handles both raw_user_meta_data and user_metadata fields
  - Synchronizes last_sign_in_at to last_login_at
  - Creates user-tenant relationships automatically

### Migration 009: User Sync Verification
- **Problem**: Need to verify user synchronization is working correctly
- **Solution**: Added comprehensive verification queries and diagnostics
- **Impact**: Provides visibility into sync status and data integrity
- **Features**:
  - Detailed comparison between auth.users and users tables
  - Mismatch detection for names, login times, and status
  - Summary statistics for sync issues

### Migration 010: Force User Sync with Audit Logs
- **Problem**: Some users still missing from application table
- **Solution**: Created user_sync_audit_logs table and forced sync all users
- **Impact**: Ensures all auth users are properly synced to application table
- **Features**:
  - user_sync_audit_logs table for tracking sync operations
  - Dynamic handling of user_tenants table structure
  - Comprehensive force sync for all users
  - Detailed audit logging for troubleshooting

### Migration 011: Fix Tenant Associations
- **Problem**: Users missing proper tenant associations in user_tenants table
- **Solution**: Comprehensive tenant association fix for all users
- **Impact**: Ensures every user has proper tenant context and associations
- **Key Features**:
  - Verifies all users have tenant associations
  - Creates missing user_tenants relationships
  - Ensures default tenant exists and is properly linked
  - Updates users.tenant_id to match default tenant
  - Dynamic handling of user_tenants table structure

## Migration Files Location

All migration files are located in:
```
src/services/migrations/migrations/
```

## Database Functions Added

### User Synchronization Functions
- `sync_auth_user_to_users()` - Main trigger function for auth.users changes
- `manually_sync_user(p_user_id UUID)` - Manual sync for specific user
- `force_sync_all_users()` - Bulk sync all users from auth.users
- `backfill_users_from_auth()` - Legacy function name alias

### Database Triggers
- `on_auth_user_created` - Primary trigger on auth.users table
- `sync_auth_users_to_users_trigger` - Secondary trigger for compatibility

### Audit Tables
- `user_sync_audit_logs` - Tracks all user synchronization operations

## Running Migrations

See [RUNNING_MIGRATIONS.md](./RUNNING_MIGRATIONS.md) for detailed instructions on how to apply migrations.

## Migration Development Guidelines

1. **Naming Convention**: `XXX_descriptive_name.ts` where XXX is a zero-padded number
2. **Idempotency**: All migrations must be idempotent (safe to run multiple times)
3. **Transaction Safety**: Wrap complex migrations in transactions
4. **Documentation**: Update this file and SCHEMA_MIGRATIONS.md after creating new migrations
5. **Testing**: Test migrations on a development database before production

## User Synchronization Status

The latest migrations (008-011) have resolved critical user synchronization and tenant association issues:

✅ **Fixed Issues:**
- Null last_login_at fields
- Missing first_name and last_name data
- Users not appearing in application tables
- Inconsistent user-tenant relationships
- Missing tenant associations in user_tenants table
- Improper tenant context for users

✅ **Current Status:**
- All auth.users automatically sync to users table
- Proper field mapping from metadata to structured fields
- Comprehensive audit logging for troubleshooting
- Real-time sync via triggers on auth operations
- All users have proper tenant associations
- Default tenant context established for all users

## Debugging Scripts

Debugging SQL scripts are stored in `/sql-scripts/debugging/`:
- `check-user-roles.sql` - Check user role assignments
- `check-roles-simple.sql` - Simplified role checking queries
- `quick-fix-rls.sql` - Quick RLS policy fixes (use with caution)
- `record-migration-007.sql` - Manual migration tracking entry

## Related Documentation

- [SCHEMA_MIGRATIONS.md](./SCHEMA_MIGRATIONS.md) - Detailed migration descriptions
- [RUNNING_MIGRATIONS.md](./RUNNING_MIGRATIONS.md) - How to run migrations
- [MIGRATION_PATTERNS.md](./MIGRATION_PATTERNS.md) - Best practices and patterns
- [ZERO_DOWNTIME_MIGRATIONS.md](./ZERO_DOWNTIME_MIGRATIONS.md) - Production migration strategies

