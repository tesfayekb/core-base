
# Detailed Migration Implementation Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Advanced Migration Patterns

### Feature Flag Integration

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

### Blue-Green Database Pattern

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

## Multi-Tenant Migration Strategies

### Tenant-by-Tenant Migration

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
}
```

## Performance Optimization Patterns

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

### Large Table Migration Batching

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
    RAISE NOTICE 'Processed % rows', offset_val;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

## Related Documentation

- **[ZERO_DOWNTIME_MIGRATIONS.md](src/docs/data-model/ZERO_DOWNTIME_MIGRATIONS.md)**: Core migration overview
- **[MIGRATION_TESTING.md](src/docs/data-model/MIGRATION_TESTING.md)**: Testing strategies
- **[MIGRATION_MONITORING.md](src/docs/data-model/MIGRATION_MONITORING.md)**: Monitoring and rollback

## Version History

- **1.0.0**: Initial detailed migration patterns (2025-05-23)
