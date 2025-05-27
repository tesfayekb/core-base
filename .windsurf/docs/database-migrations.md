# Database Migration Documentation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-26  
> **Current Migration Version**: 007

## Overview

This document provides comprehensive information about the database migration system for the Core Base application. All migrations follow a structured approach with proper documentation, testing, and rollback procedures.

## Migration System Architecture

### Core Components

1. **Migration Runner** (`src/services/migrations/migrationRunner.ts`)
   - Handles migration execution
   - Tracks applied migrations
   - Ensures idempotency

2. **Migration Files** (`src/services/migrations/migrations/`)
   - TypeScript files defining SQL migrations
   - Version-numbered for sequential execution
   - Self-contained and atomic

3. **Documentation** (`src/docs/data-model/`)
   - Detailed migration descriptions
   - History tracking
   - Pattern guidelines

## Applied Migrations

### 000_migration_infrastructure
**Purpose**: Sets up the migration tracking system  
**Phase**: 1.2 - Migration System Foundation  
**Key Changes**:
- Creates `migrations` table for tracking
- Adds helper functions for migration execution
- Establishes infrastructure for future migrations

### 001_create_core_schema
**Purpose**: Establishes core database schema  
**Phase**: 1.2 - Database Foundation  
**Key Changes**:
- Creates `tenants` table for multi-tenancy
- Creates `users` table with tenant association
- Sets up user profiles and password history
- Enables required PostgreSQL extensions
- Creates custom types (user_status, audit_event_type, permission_action)

### 002_create_rbac_tables
**Purpose**: Implements Role-Based Access Control  
**Phase**: 1.2 - RBAC Foundation  
**Key Changes**:
- Creates `roles` table with tenant scoping
- Creates `permissions` table for actions
- Establishes role-permission relationships
- Sets up user role assignments

### 003_create_audit_session_tables
**Purpose**: Implements audit logging and session management  
**Phase**: 1.2 - Audit System Foundation  
**Key Changes**:
- Creates `audit_logs` table for comprehensive logging
- Creates `user_sessions` table for session tracking
- Adds security-related tables
- Implements activity monitoring

### 003_create_database_functions
**Purpose**: Adds utility database functions  
**Phase**: 1.2 - Database Functions  
**Key Changes**:
- Creates reusable SQL functions
- Adds trigger functions
- Implements helper procedures

### 004_create_indexes
**Purpose**: Optimizes database performance  
**Phase**: 1.2 - Performance Optimization  
**Key Changes**:
- Adds indexes on foreign keys
- Creates performance-critical indexes
- Optimizes common query patterns

### 005_enable_rls_policies
**Purpose**: Implements Row-Level Security  
**Phase**: 1.2 - Security Implementation  
**Key Changes**:
- Enables RLS on all tables
- Creates tenant isolation policies
- Implements permission-based access

### 006_create_utility_functions
**Purpose**: Adds permission checking functions  
**Phase**: 1.2 - Utility Functions  
**Key Changes**:
- Creates `check_user_permission` function
- Adds tenant context validation
- Implements permission resolution logic

### 007_fix_rls_policies_for_initial_setup
**Purpose**: Fixes RLS policies for initial tenant creation  
**Phase**: 1.2 - RLS Policy Fix  
**Key Changes**:
- Allows authenticated users to create initial tenants
- Fixes user_tenants insert policy
- Enables SuperAdmin role assignment

## Migration Patterns

### Standard Migration Structure

```typescript
import { Migration } from '../migrationRunner';

const migration: Migration = {
  version: 'XXX',
  name: 'descriptive_name',
  script: `
    -- Migration Title
    -- Version: X.X.X
    -- Phase X.X: Component Name
    
    -- Rollback instructions (commented)
    -- To rollback: DROP TABLE table_name;
    
    -- Main migration SQL
    CREATE TABLE IF NOT EXISTS table_name (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      -- columns
    );
  `
};

export default migration;
```

### Best Practices

1. **Idempotency**
   - Use `IF NOT EXISTS` for CREATE statements
   - Use `IF EXISTS` for DROP statements
   - Make migrations safe to run multiple times

2. **Transactions**
   - Wrap complex changes in transactions
   - Ensure atomicity of related changes

3. **Performance**
   - Consider table size when adding indexes
   - Use CONCURRENTLY for index creation on large tables
   - Document expected performance impact

4. **Security**
   - Always consider RLS policies
   - Maintain tenant isolation
   - Document security implications

## Enhanced Migration System

The project includes an enhanced migration system with:

### Dependency Checking
- Automatic circular dependency detection
- Prerequisite validation
- Topological sorting for execution order

### Rollback Testing
- Automated rollback test generation
- Data integrity verification
- Performance metrics collection

### Performance Assessment
- Operation impact analysis
- Resource requirement calculation
- Execution time estimation

## Running Migrations

### Prerequisites
1. Supabase CLI installed
2. Database connection configured
3. Appropriate permissions

### Execution Steps

```bash
# Navigate to project root
cd /path/to/core-base

# Run all pending migrations
npm run db:migrate

# Run specific migration
npm run db:migrate -- --version=007

# Check migration status
npm run db:status
```

### Manual Execution

For manual migration execution:

```sql
-- Check current migration status
SELECT version, name, applied_at 
FROM migrations 
ORDER BY version;

-- Apply migration manually
BEGIN;
  -- Run migration SQL
  -- Insert migration record
  INSERT INTO migrations (version, name, script, hash, applied_by)
  VALUES ('008', 'migration_name', 'script_content', 'hash', current_user);
COMMIT;
```

## Debugging and Troubleshooting

### Common Issues

1. **RLS Policy Violations**
   - Check tenant context
   - Verify user permissions
   - Review policy definitions

2. **Migration Failures**
   - Check for dependency issues
   - Verify SQL syntax
   - Review error logs

3. **Performance Problems**
   - Analyze query plans
   - Check index usage
   - Monitor resource usage

### Debugging Scripts

Located in `sql-scripts/debugging/`:
- `check-rls-policies.sql` - Verify RLS configuration
- `check-permissions.sql` - Test permission functions
- `check-tenant-isolation.sql` - Validate multi-tenancy

## Future Migration Guidelines

### Planning New Migrations

1. **Assess Impact**
   - Determine affected tables
   - Estimate data volume
   - Identify dependencies

2. **Document Requirements**
   - Define success criteria
   - List rollback procedures
   - Note security considerations

3. **Test Thoroughly**
   - Run on test database
   - Verify idempotency
   - Test rollback procedure

### Migration Checklist

- [ ] Follow naming convention (XXX_descriptive_name.ts)
- [ ] Include phase and version comments
- [ ] Add rollback instructions
- [ ] Make idempotent
- [ ] Update SCHEMA_MIGRATIONS.md
- [ ] Update MIGRATION_HISTORY.md
- [ ] Test on clean database
- [ ] Test rollback procedure
- [ ] Verify RLS policies
- [ ] Check performance impact

## Related Documentation

- [SCHEMA_MIGRATIONS.md](../../src/docs/data-model/SCHEMA_MIGRATIONS.md) - Detailed migration descriptions
- [MIGRATION_HISTORY.md](../../src/docs/data-model/MIGRATION_HISTORY.md) - Migration status tracking
- [RUNNING_MIGRATIONS.md](../../src/docs/data-model/RUNNING_MIGRATIONS.md) - Execution guide
- [MIGRATION_PATTERNS.md](../../src/docs/data-model/MIGRATION_PATTERNS.md) - Advanced patterns
- [DATABASE_SCHEMA.md](../../src/docs/data-model/DATABASE_SCHEMA.md) - Current schema reference

## Version History

- **1.0.0** (2025-05-26): Initial comprehensive documentation
