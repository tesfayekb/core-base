
# Multi-tenant Database Query Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines standardized query patterns for multi-tenant database operations. It serves as the canonical reference for implementing database queries that properly respect tenant boundaries and optimize performance in multi-tenant scenarios.

## Multi-tenancy Model

The system implements a **tenant-isolation model** with these key characteristics:

1. **Shared Database, Tenant-Specific Rows**: All tenants share the same database tables, but rows are segregated by tenant_id
2. **Row-Level Security (RLS)**: Database-enforced tenant isolation through RLS policies
3. **Tenant Context**: Application maintains current tenant context for all operations

## Query Pattern Principles

All database queries must follow these principles:

1. **Explicit Tenant Filtering**: Every query must explicitly filter by tenant_id
2. **Default Tenant Context**: Use the current tenant context unless explicitly overridden
3. **Tenant Validation**: Validate tenant access rights before executing queries
4. **Single Tenant Per Query**: Cross-tenant queries are prohibited by default

## Standard Query Patterns

### Basic CRUD Operations

#### Select Query Pattern

```sql
-- Single record query
SELECT *
FROM table_name
WHERE tenant_id = :current_tenant_id
AND id = :record_id;

-- Collection query
SELECT *
FROM table_name
WHERE tenant_id = :current_tenant_id
AND field_name = :field_value
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

#### Insert Query Pattern

```sql
-- Single record insert
INSERT INTO table_name (
  tenant_id,
  field1,
  field2,
  -- other fields
)
VALUES (
  :current_tenant_id,
  :field1_value,
  :field2_value,
  -- other values
)
RETURNING id;
```

#### Update Query Pattern

```sql
-- Single record update
UPDATE table_name
SET
  field1 = :field1_value,
  field2 = :field2_value,
  updated_at = NOW()
WHERE
  tenant_id = :current_tenant_id
  AND id = :record_id;
```

#### Delete Query Pattern

```sql
-- Single record delete
DELETE FROM table_name
WHERE tenant_id = :current_tenant_id
AND id = :record_id;
```

### Advanced Query Patterns

#### Joins with Tenant Context

```sql
-- Join pattern maintaining tenant isolation
SELECT a.*, b.name as related_name
FROM table_a a
JOIN table_b b ON a.related_id = b.id AND b.tenant_id = :current_tenant_id
WHERE a.tenant_id = :current_tenant_id
AND a.status = :status;
```

#### Aggregation with Tenant Isolation

```sql
-- Aggregation respecting tenant boundaries
SELECT 
  category,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM transactions
WHERE tenant_id = :current_tenant_id
GROUP BY category
ORDER BY total_amount DESC;
```

#### Pagination with Tenant Context

```sql
-- Cursor-based pagination (recommended for large datasets)
SELECT *
FROM table_name
WHERE tenant_id = :current_tenant_id
AND (created_at, id) < (:last_seen_date, :last_seen_id)
ORDER BY created_at DESC, id DESC
LIMIT :page_size;

-- Offset pagination (for smaller datasets)
SELECT *
FROM table_name
WHERE tenant_id = :current_tenant_id
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

## Query Optimization Techniques

### Tenant-Aware Indexing

All multi-tenant tables should have these indexes:

```sql
-- Primary index including tenant_id for clustered data
CREATE INDEX idx_table_tenant_id ON table_name (tenant_id);

-- Compound indexes for common query patterns
CREATE INDEX idx_table_tenant_status ON table_name (tenant_id, status);
CREATE INDEX idx_table_tenant_created ON table_name (tenant_id, created_at DESC);
```

### Query Execution Plans

Always analyze query plans to ensure tenant_id filtering happens early:

```sql
EXPLAIN ANALYZE
SELECT * FROM table_name 
WHERE tenant_id = :current_tenant_id
AND status = 'active';
```

Ensure the execution plan shows an index scan on the tenant_id field.

### Connection Pooling Strategy

Use tenant-aware connection pooling:

1. **Tenant Context Setting**: Set tenant context when acquiring connection
2. **RLS Enforcement**: Use RLS to enforce tenant isolation
3. **Connection Limits**: Per-tenant connection limits

```typescript
// Setting tenant context on connection acquisition
async function getConnection(tenantId: string) {
  const connection = await pool.acquire();
  await connection.query('SET app.current_tenant_id = $1', [tenantId]);
  return connection;
}
```

## Row-Level Security Implementation

All multi-tenant tables should implement RLS policies:

```sql
-- Enable RLS on table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation_policy 
ON table_name
USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

## System-Level Tables

Some tables may need system-level (cross-tenant) access:

```sql
-- Super admin access to tenant data
CREATE POLICY super_admin_policy
ON tenants
USING (
  (SELECT is_super_admin FROM user_roles WHERE user_id = auth.uid())
  OR tenant_id = current_setting('app.current_tenant_id')::UUID
);
```

## Testing Multi-tenant Queries

### Test Case Structure

All database queries must be tested with:

1. **Correct Tenant Access**: Confirm data access works with proper tenant context
2. **Cross-Tenant Protection**: Verify data from other tenants is inaccessible
3. **Performance Testing**: Ensure tenant filtering performs well at scale

### Example Test Cases

```typescript
describe('Multi-tenant Query Tests', () => {
  let tenant1Id, tenant2Id, user1Id, user2Id;
  
  beforeAll(async () => {
    // Set up test tenants and users
    tenant1Id = await createTestTenant('Tenant 1');
    tenant2Id = await createTestTenant('Tenant 2');
    user1Id = await createTestUser(tenant1Id);
    user2Id = await createTestUser(tenant2Id);
  });
  
  test('User can only access own tenant data', async () => {
    // Set tenant context to tenant1
    await setTenantContext(tenant1Id);
    
    // Create record in tenant1
    const recordId = await createTestRecord({ name: 'Test Record' });
    
    // Verify access in correct tenant
    const record = await getRecord(recordId);
    expect(record).not.toBeNull();
    
    // Change tenant context to tenant2
    await setTenantContext(tenant2Id);
    
    // Verify access denied in wrong tenant
    const result = await getRecord(recordId);
    expect(result).toBeNull();
  });
});
```

## Common Pitfalls and Solutions

### Cross-Tenant Data Leakage

**Problem**: Queries that don't properly filter by tenant_id can leak data across tenants.

**Solution**: 
- Use parameterized queries with explicit tenant filtering
- Implement RLS as a safety net
- Add automated tests for tenant isolation

### N+1 Query Problem

**Problem**: Fetching related data for multiple records can cause N+1 query patterns, especially problematic in multi-tenant systems.

**Solution**:
- Use JOIN operations to fetch related data in a single query
- Implement DataLoader pattern for batch loading
- Use query optimization to reduce database roundtrips

### Connection Pool Saturation

**Problem**: Large tenants can consume disproportionate connection resources.

**Solution**:
- Implement per-tenant connection limits
- Use fair scheduling algorithms for connection allocation
- Monitor connection usage patterns

## Related Documentation

- **[DATA_ISOLATION.md](DATA_ISOLATION.md)**: Multi-tenant data isolation principles
- **[../data-model/DATABASE_SCHEMA.md](../data-model/DATABASE_SCHEMA.md)**: Schema definitions
- **[../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)**: Entity-level permission boundaries
- **[../security/MULTI_TENANT_ROLES.md](../security/MULTI_TENANT_ROLES.md)**: Multi-tenant role management
- **[../data-model/DATA_INTEGRITY.md](../data-model/DATA_INTEGRITY.md)**: Data integrity constraints

## Version History

- **1.0.0**: Initial document creation (2025-05-22)
