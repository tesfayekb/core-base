
# Zero-Downtime Migration Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides comprehensive patterns and strategies for performing database and application migrations without service interruption, ensuring continuous availability during system updates.

## Zero-Downtime Migration Principles

### Core Principles
1. **Backward Compatibility**: New schema must work with old application code
2. **Forward Compatibility**: Old schema must work with new application code
3. **Gradual Rollout**: Changes deployed incrementally with validation at each step
4. **Instant Rollback**: Ability to immediately revert without downtime

### Migration Types by Downtime Risk

| Migration Type | Risk Level | Strategy Required |
|---------------|------------|-------------------|
| Add Column (nullable) | Low | Direct deployment |
| Add Column (non-nullable) | Medium | Multi-phase approach |
| Rename Column | High | Alias pattern |
| Drop Column | High | Deprecation pattern |
| Change Data Type | High | Shadow column pattern |
| Add Index | Medium | Online index creation |
| Add Constraint | High | Validation then enforcement |

## Zero-Downtime Patterns

### 1. Expand-Contract Pattern

The most fundamental pattern for zero-downtime migrations:

**Phase 1: Expand**
- Add new schema elements alongside existing ones
- Deploy application code that can handle both old and new schema
- Validate that both schemas work correctly

**Phase 2: Migrate**
- Gradually move data from old to new schema
- Ensure data consistency between old and new structures
- Monitor performance and rollback capability

**Phase 3: Contract**
- Remove old schema elements
- Clean up temporary migration code
- Optimize new schema structure

```sql
-- Example: Expanding user table with new email_verified column
-- Phase 1: Expand
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;

-- Phase 2: Migrate (background process)
UPDATE users SET email_verified = true WHERE email_verification_token IS NULL;

-- Phase 3: Contract (in later migration)
ALTER TABLE users DROP COLUMN email_verification_token;
```

### 2. Shadow Column Pattern

For changing data types or complex transformations:

```sql
-- Phase 1: Add shadow column
ALTER TABLE users ADD COLUMN phone_number_new VARCHAR(20);

-- Phase 2: Populate shadow column
UPDATE users SET phone_number_new = format_phone_number(phone_number);

-- Phase 3: Application code supports both columns
-- Deploy code that reads from phone_number_new, writes to both

-- Phase 4: Switch reads to new column
-- Deploy code that reads from phone_number_new only

-- Phase 5: Clean up
ALTER TABLE users DROP COLUMN phone_number;
ALTER TABLE users RENAME COLUMN phone_number_new TO phone_number;
```

### 3. Feature Flag Integration

Combining migrations with feature flags for safe rollouts:

```typescript
// Application code with feature flag support
const getUserProfile = async (userId: string) => {
  const baseQuery = db.from('users').select('id, name, email');
  
  if (featureFlags.isEnabled('new_profile_fields')) {
    // Use new schema
    return baseQuery.select('*, profile_data, preferences').eq('id', userId);
  } else {
    // Use old schema
    return baseQuery.eq('id', userId);
  }
};
```

### 4. Blue-Green Database Pattern

For major schema changes requiring full migration:

```typescript
// Database versioning strategy
interface DatabaseVersion {
  version: string;
  connectionPool: DatabasePool;
  isActive: boolean;
  migrationStatus: 'pending' | 'in-progress' | 'complete' | 'failed';
}

class BlueGreenMigrationManager {
  private databases: Map<string, DatabaseVersion> = new Map();
  
  async startMigration(newVersion: string): Promise<void> {
    // Create new database version
    const newDb = await this.createDatabaseVersion(newVersion);
    
    // Start data migration in background
    await this.startDataMigration(this.getActiveDb(), newDb);
    
    // Switch traffic gradually
    await this.gradualTrafficSwitch(newDb);
  }
  
  private async gradualTrafficSwitch(newDb: DatabaseVersion): Promise<void> {
    const percentages = [5, 10, 25, 50, 75, 100];
    
    for (const percentage of percentages) {
      await this.routeTraffic(percentage, newDb);
      await this.validatePerformance(newDb);
      await this.sleep(300000); // 5 minutes between steps
    }
  }
}
```

## Multi-Tenant Zero-Downtime Strategies

### Tenant-by-Tenant Migration

For multi-tenant systems, migrate tenants individually:

```typescript
interface TenantMigrationPlan {
  tenantId: string;
  migrationPhase: 'pending' | 'started' | 'validating' | 'complete' | 'rolled-back';
  startTime?: Date;
  completionTime?: Date;
  rollbackPlan: string[];
}

class TenantMigrationOrchestrator {
  async migrateTenantsBatch(tenants: string[], batchSize: number = 5): Promise<void> {
    const batches = this.createBatches(tenants, batchSize);
    
    for (const batch of batches) {
      await Promise.all(batch.map(tenantId => this.migrateTenant(tenantId)));
      await this.validateBatchMigration(batch);
    }
  }
  
  private async migrateTenant(tenantId: string): Promise<void> {
    const plan = await this.createMigrationPlan(tenantId);
    
    try {
      await this.executeMigrationSteps(plan);
      await this.validateTenantMigration(tenantId);
    } catch (error) {
      await this.rollbackTenant(tenantId, plan);
      throw error;
    }
  }
}
```

### Tenant Isolation During Migration

```sql
-- Create tenant-specific migration tracking
CREATE TABLE tenant_migration_status (
  tenant_id UUID PRIMARY KEY,
  migration_version VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  rollback_plan JSONB
);

-- Tenant-aware application routing
CREATE OR REPLACE FUNCTION get_tenant_schema_version(p_tenant_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_version VARCHAR(50);
BEGIN
  SELECT migration_version INTO schema_version
  FROM tenant_migration_status
  WHERE tenant_id = p_tenant_id;
  
  RETURN COALESCE(schema_version, 'baseline');
END;
$$;
```

## Performance Considerations

### Online Index Creation

```sql
-- PostgreSQL: Create indexes concurrently
CREATE INDEX CONCURRENTLY idx_users_email_verified 
ON users (email) WHERE email_verified = true;

-- Monitor index creation progress
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_stat_progress_create_index;
```

### Large Table Migrations

```sql
-- Batch processing for large tables
DO $$
DECLARE
  batch_size INTEGER := 10000;
  offset_val INTEGER := 0;
  rows_affected INTEGER;
BEGIN
  LOOP
    UPDATE users 
    SET email_verified = true 
    WHERE id IN (
      SELECT id FROM users 
      WHERE email_verification_token IS NULL 
      AND email_verified IS NULL
      LIMIT batch_size OFFSET offset_val
    );
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    EXIT WHEN rows_affected = 0;
    
    offset_val := offset_val + batch_size;
    
    -- Progress logging
    RAISE NOTICE 'Processed % rows', offset_val;
    
    -- Brief pause to reduce system load
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

## Rollback Strategies

### Automated Rollback Triggers

```typescript
interface RollbackTrigger {
  metric: string;
  threshold: number;
  action: 'warn' | 'pause' | 'rollback';
}

class MigrationMonitor {
  private rollbackTriggers: RollbackTrigger[] = [
    { metric: 'error_rate', threshold: 0.05, action: 'pause' },
    { metric: 'response_time_p95', threshold: 2000, action: 'warn' },
    { metric: 'error_rate', threshold: 0.1, action: 'rollback' }
  ];
  
  async monitorMigration(migrationId: string): Promise<void> {
    const checkInterval = setInterval(async () => {
      const metrics = await this.collectMetrics();
      
      for (const trigger of this.rollbackTriggers) {
        if (metrics[trigger.metric] > trigger.threshold) {
          await this.handleTrigger(migrationId, trigger, metrics);
        }
      }
    }, 30000); // Check every 30 seconds
  }
  
  private async handleTrigger(
    migrationId: string, 
    trigger: RollbackTrigger, 
    metrics: Record<string, number>
  ): Promise<void> {
    switch (trigger.action) {
      case 'warn':
        await this.sendAlert(`Migration ${migrationId} metric warning`, { trigger, metrics });
        break;
      case 'pause':
        await this.pauseMigration(migrationId);
        break;
      case 'rollback':
        await this.initiateRollback(migrationId);
        break;
    }
  }
}
```

### Point-in-Time Recovery Setup

```sql
-- Enable point-in-time recovery before major migrations
SELECT pg_start_backup('pre_migration_backup', false);

-- Create logical replication slot for rollback capability
SELECT pg_create_logical_replication_slot('migration_rollback_slot', 'pgoutput');

-- After successful migration, clean up
SELECT pg_drop_replication_slot('migration_rollback_slot');
```

## Testing Zero-Downtime Migrations

### Migration Testing Framework

```typescript
class MigrationTestSuite {
  async testZeroDowntimeMigration(migration: Migration): Promise<TestResults> {
    const results: TestResults = {
      downtime: 0,
      dataConsistency: true,
      performanceImpact: {},
      rollbackSuccess: true
    };
    
    // Start traffic simulation
    const trafficSimulator = new TrafficSimulator();
    await trafficSimulator.start();
    
    // Monitor downtime
    const downtimeMonitor = new DowntimeMonitor();
    downtimeMonitor.start();
    
    try {
      // Execute migration
      await migration.execute();
      
      // Validate data consistency
      results.dataConsistency = await this.validateDataConsistency();
      
      // Measure performance impact
      results.performanceImpact = await this.measurePerformanceImpact();
      
      // Test rollback capability
      await migration.rollback();
      results.rollbackSuccess = await this.validateRollbackSuccess();
      
    } finally {
      results.downtime = downtimeMonitor.getTotalDowntime();
      await trafficSimulator.stop();
    }
    
    return results;
  }
}
```

## Related Documentation

- **[SCHEMA_MIGRATIONS.md](SCHEMA_MIGRATIONS.md)**: Basic migration framework
- **[DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md)**: Performance optimization strategies
- **[../multitenancy/DATA_ISOLATION.md](../multitenancy/DATA_ISOLATION.md)**: Multi-tenant considerations

## Version History

- **1.0.0**: Initial zero-downtime migration patterns documentation (2025-05-23)
