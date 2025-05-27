# Migration History and Tracking

## Overview

This document tracks all database migrations applied to the Core Base system, their status, and important notes about each migration.

## Migration Status

Last Updated: 2025-01-27

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

## Critical Migrations

### Migration 007: RLS Policy Fix
- **Problem**: Users could not create initial tenants due to restrictive RLS policies
- **Solution**: Relaxed policies to allow authenticated users to create initial data
- **Impact**: Essential for new user onboarding
- **Future Work**: Implement server-side tenant creation for production

## Migration Files Location

All migration files are located in:
```
src/services/migrations/migrations/
```

## Running Migrations

See [RUNNING_MIGRATIONS.md](./RUNNING_MIGRATIONS.md) for detailed instructions on how to apply migrations.

## Migration Development Guidelines

1. **Naming Convention**: `XXX_descriptive_name.ts` where XXX is a zero-padded number
2. **Idempotency**: All migrations must be idempotent (safe to run multiple times)
3. **Transaction Safety**: Wrap complex migrations in transactions
4. **Documentation**: Update this file and SCHEMA_MIGRATIONS.md after creating new migrations
5. **Testing**: Test migrations on a development database before production

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
