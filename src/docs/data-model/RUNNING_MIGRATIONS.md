# Running Database Migrations

## Quick Start

### 1. Run Migrations via Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to SQL Editor
3. Run the migrations in order:
   - Start with migration 001 and work your way up
   - Each migration file is in `src/services/migrations/migrations/`

### 2. Run Migrations Programmatically

```bash
# Install dependencies
npm install

# Run migrations (once the migration runner is configured)
npm run migrate
```

## Current Migration Status

As of 2025-01-27, you should have these migrations:

1. `000_migration_infrastructure.ts` - Sets up migration tracking
2. `001_create_core_schema.ts` - Core database schema
3. `002_create_rbac_tables.ts` - Role-based access control tables
4. `003_create_audit_session_tables.ts` - Audit and session tracking
5. `003_create_database_functions.ts` - Database functions
6. `004_create_indexes.ts` - Performance indexes
7. `005_enable_rls_policies.ts` - Original RLS policies
8. **`007_fix_rls_policies_for_initial_setup.ts` - Fixed RLS policies (NEW)**

## Important: Migration 007

This migration fixes the RLS policies to allow initial tenant creation. Without it, new users will encounter:
```
ERROR: new row violates row-level security policy for table "tenants"
```

### What it does:
- Allows authenticated users to create their first tenant
- Enables users to set up their initial profile
- Provides temporary relaxed permissions for roles setup

### Security Note:
These policies are simplified for initial setup. For production:
1. Implement server-side tenant creation
2. Use more restrictive RLS policies
3. Add proper role-based checks

## Verifying Migrations

After running migrations, verify:

```sql
-- Check migration status
SELECT * FROM migrations ORDER BY applied_at;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('tenants', 'users', 'roles', 'user_roles', 'user_tenants');

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Troubleshooting

If you still can't create tenants after migration 007:

1. **Clear browser cache** and localStorage
2. **Sign out and sign back in**
3. **Check Supabase logs** for any errors
4. **Verify auth.uid()** is working:
   ```sql
   SELECT auth.uid();
   ```

If issues persist, the problem might be:
- Supabase Auth not properly configured
- Missing environment variables
- Browser caching old session data
