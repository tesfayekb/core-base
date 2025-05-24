
# Audit Logging Database Structure

## Core Logging Schema

```sql
-- System-wide logging table with efficient indexing
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('security', 'user_activity', 'system', 'performance')),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  resource_urn TEXT, -- URI-based identifier for cross-system traceability
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Critical security events with additional verification
CREATE TABLE security_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES system_logs(id),
  verification_hash TEXT NOT NULL, -- Stores cryptographic proof
  previous_record_hash TEXT -- For tamper evidence chain
);

-- Log entity relationships for better traceability
CREATE TABLE log_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES system_logs(id),
  related_entity_type TEXT NOT NULL, -- 'user', 'resource', 'permission', etc.
  related_entity_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- 'created_by', 'affected', 'modified', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Schema Design Principles

The audit logging database schema is designed with the following principles:

1. **Efficient Querying**: Properly indexed for fast retrieval
2. **Scalability**: Supports high-volume logging
3. **Integrity**: Prevents unauthorized modifications
4. **Flexibility**: Accommodates various event types
5. **Relationship Tracking**: Maps connections between entities

## Performance Optimizations

The schema includes several optimizations:

1. **Indexing Strategy**:
   - Timestamp index for chronological queries
   - Category and level indexes for filtered views
   - User ID index for user activity reports
   - Resource indexes for entity-specific queries

2. **Partitioning**:
   - Time-based partitioning for efficient pruning
   - Category-based partitioning for focused queries

3. **JSON Storage**:
   - JSONB for flexible event details
   - Indexable JSON fields for common query patterns

## Related Documentation

- **[STORAGE_RETENTION.md](STORAGE_RETENTION.md)**: Log storage and retention policies
- **[PERFORMANCE_STRATEGIES.md](PERFORMANCE_STRATEGIES.md)**: Performance optimization strategies
