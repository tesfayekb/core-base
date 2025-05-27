# Migration Quick Reference for AI

> **IMPORTANT**: This is a quick reference guide for AI assistants working with the Core Base migrations.  
> **Current Migration Version**: 007 (fix_rls_policies_for_initial_setup)  
> **All migrations are already applied to production**

## Migration Files Location

```
src/services/migrations/migrations/
├── 000_migration_infrastructure.ts
├── 001_create_core_schema.ts  
├── 002_create_rbac_tables.ts
├── 003_create_audit_session_tables.ts
├── 003_create_database_functions.ts
├── 004_create_indexes.ts
├── 005_enable_rls_policies.ts
├── 006_create_utility_functions.ts
└── 007_fix_rls_policies_for_initial_setup.ts
```

## Complete Migration Summary

### 000 - Migration Infrastructure
- Creates `migrations` table to track all migrations
- Sets up helper functions for executing migrations
- **Status**: ✅ Applied

### 001 - Core Schema
- Creates `tenants` table (multi-tenancy foundation)
- Creates `users` table with auth integration
- Creates `user_tenants` for tenant membership
- Enables PostgreSQL extensions (uuid-ossp, pgcrypto)
- **Status**: ✅ Applied

### 002 - RBAC Tables
- Creates `roles` table with tenant scoping
- Creates `permissions` table for fine-grained access
- Creates `role_permissions` junction table
- Creates `user_roles` for role assignments
- **Status**: ✅ Applied

### 003 - Audit & Session Tables
- Creates `audit_logs` for comprehensive logging
- Creates `user_sessions` for session tracking
- Implements security audit trail
- **Status**: ✅ Applied

### 003 - Database Functions (duplicate version number)
- Creates utility functions for common operations
- Adds trigger functions for timestamps
- Implements helper procedures
- **Status**: ✅ Applied

### 004 - Performance Indexes
- Adds indexes on all foreign keys
- Creates composite indexes for common queries
- Optimizes tenant-scoped queries
- **Status**: ✅ Applied

### 005 - RLS Policies (Initial)
- Enables Row Level Security on all tables
- Creates initial restrictive policies
- **Note**: Too restrictive, fixed in migration 007
- **Status**: ✅ Applied

### 006 - Utility Functions
- Creates `has_permission()` function
- Adds role and permission helper functions
- Implements security check functions
- **Status**: ✅ Applied

### 007 - Fix RLS Policies ⚠️ CRITICAL
- **Problem Fixed**: Users couldn't create initial tenants
- Relaxes policies for authenticated users
- Allows initial data creation
- **This is the current production state**
- **Status**: ✅ Applied

## Key Documentation Files

1. **Detailed Migration Descriptions**: 
   - `src/docs/data-model/SCHEMA_MIGRATIONS.md`
   - `.windsurf/docs/database-migrations.md`

2. **Migration History & Status**: 
   - `src/docs/data-model/MIGRATION_HISTORY.md`

3. **Entity Relationships**: 
   - `.windsurf/docs/entity-relationships.md`
   - `src/docs/data-model/entity-relationships/` (folder)

4. **Running Migrations**: 
   - `src/docs/data-model/RUNNING_MIGRATIONS.md`

## Important Notes for AI

1. **All migrations are already applied** - No need to run them unless explicitly asked
2. **Migration 007 is critical** - It fixes the RLS policies for initial setup
3. **Manual SQL scripts** in `sql-scripts/debugging/` are for debugging only
4. **Don't create duplicate migrations** - Check existing ones first
5. **Current database state** reflects all migrations 000-007

## Common Tasks

### Check Migration Status
```typescript
// Migrations are tracked in the 'migrations' table
SELECT version, name, applied_at FROM migrations ORDER BY version;
```

### Add New Migration
1. Create file: `008_your_migration_name.ts` in migrations folder
2. Follow the TypeScript migration structure
3. Update documentation files
4. Test thoroughly before applying

### Debug Database Issues
- Use scripts in `sql-scripts/debugging/`
- Check RLS policies with `check-user-roles-fixed.sql`
- Verify permissions with utility functions from migration 006
