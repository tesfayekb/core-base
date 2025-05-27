# Entity Relationships Documentation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-26  
> **Source**: src/docs/data-model/entity-relationships/

## Overview

This document provides a comprehensive overview of the entity relationships in the Core Base application, focusing on the multi-tenant architecture with RBAC (Role-Based Access Control) implementation.

## Core Entity Relationships

### 1. Tenant-Centric Architecture

The application follows a strict multi-tenant architecture where nearly all entities are scoped to a tenant:

```
Tenant (1) ──────────┬──── (*) Users
                     ├──── (*) Roles  
                     ├──── (*) Resources
                     └──── (*) Audit Logs
```

**Key Principles**:
- Every user belongs to at least one tenant
- Data isolation enforced through Row-Level Security (RLS)
- Tenant context required for all operations

### 2. User Identity System

```
auth.users (Supabase) ──── (1:1) ──── profiles
     │
     ├──── (1:*) ──── user_tenants
     ├──── (1:*) ──── user_roles
     ├──── (1:*) ──── user_permissions
     ├──── (1:*) ──── user_sessions
     └──── (1:*) ──── password_history
```

**Relationships**:
- **auth.users**: Core authentication managed by Supabase
- **profiles**: Extended user information (1:1 with auth.users)
- **user_tenants**: Many-to-many relationship between users and tenants
- **user_roles**: User role assignments within tenant context
- **user_permissions**: Direct permission grants (overrides)

### 3. RBAC (Role-Based Access Control)

```
Roles ──── (*:*) ──── Permissions ──── (*:1) ──── Resources
  │                         │
  └─── User Roles ───┘      └─── User Permissions
```

**Key Tables**:
- **roles**: Tenant-scoped roles
- **permissions**: Actions on resources
- **resources**: System resources (users, tenants, etc.)
- **role_permissions**: Many-to-many junction
- **user_roles**: User role assignments
- **user_permissions**: Direct permission overrides

### 4. Audit and Security

```
Audit Logs ──── References ──── All Entity Changes
     │
     └──── Categorized by ──── audit_event_type
```

**Audit Coverage**:
- Authentication events
- Authorization checks
- Data access
- Data modifications
- System events
- Security events

## Detailed Entity Specifications

### Tenants Table

```sql
tenants
├── id (UUID, PK)
├── name (VARCHAR)
├── slug (VARCHAR, UNIQUE) 
├── domain (VARCHAR)
├── settings (JSONB)
├── status (user_status)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
├── created_by (UUID, FK → auth.users)
└── updated_by (UUID, FK → auth.users)
```

**Business Rules**:
- Slug must be unique across system
- Settings store tenant-specific configurations
- Status controls tenant access

### Users and Authentication

```sql
profiles (extends auth.users)
├── id (UUID, PK, FK → auth.users)
├── full_name (TEXT)
├── avatar_url (TEXT)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── last_sign_in_at (TIMESTAMP)

user_tenants (junction table)
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── tenant_id (UUID, FK → tenants)
├── is_primary (BOOLEAN)
├── created_at (TIMESTAMP)
└── created_by (UUID, FK → auth.users)
```

**Key Constraints**:
- One primary tenant per user
- User must have at least one tenant
- Cascade delete on user removal

### RBAC Structure

```sql
roles
├── id (UUID, PK)
├── tenant_id (UUID, FK → tenants)
├── name (VARCHAR)
├── description (TEXT)
├── is_system_role (BOOLEAN)
├── metadata (JSONB)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

permissions
├── id (UUID, PK)
├── resource (VARCHAR)
├── action (VARCHAR)
├── description (TEXT)
├── created_at (TIMESTAMP)
└── UNIQUE(resource, action)

role_permissions
├── id (UUID, PK)
├── role_id (UUID, FK → roles)
├── permission_id (UUID, FK → permissions)
├── created_at (TIMESTAMP)
└── UNIQUE(role_id, permission_id)
```

**Permission Model**:
- Resource + Action = Permission
- Roles aggregate permissions
- Direct user permissions override role permissions

### Audit System

```sql
audit_logs
├── id (UUID, PK)
├── tenant_id (UUID, FK → tenants)
├── user_id (UUID, FK → auth.users)
├── event_type (audit_event_type)
├── resource_type (VARCHAR)
├── resource_id (UUID)
├── action (VARCHAR)
├── details (JSONB)
├── ip_address (INET)
├── user_agent (TEXT)
├── created_at (TIMESTAMP)
└── INDEX on (tenant_id, created_at)
```

**Audit Requirements**:
- All data changes logged
- Immutable once created
- Tenant-scoped for isolation

## Row-Level Security (RLS) Policies

### Tenant Isolation

All tables implement RLS policies ensuring:
1. Users can only access data within their tenant(s)
2. System roles bypass tenant restrictions
3. Initial tenant creation allowed for new users

### Policy Examples

```sql
-- Users can only see data in their tenants
CREATE POLICY tenant_isolation ON table_name
  FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid()
  ));

-- System admins bypass tenant restrictions  
CREATE POLICY system_admin_bypass ON table_name
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'SuperAdmin'
      AND r.is_system_role = true
    )
  );
```

## Query Patterns

### Common Query Patterns

1. **Get User Permissions**
```sql
-- Get all permissions for a user in current tenant
WITH user_role_permissions AS (
  SELECT DISTINCT p.*
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = $1 AND ur.tenant_id = $2
),
direct_permissions AS (
  SELECT p.*
  FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = $1 AND up.tenant_id = $2
)
SELECT * FROM user_role_permissions
UNION
SELECT * FROM direct_permissions;
```

2. **Check User Permission**
```sql
-- Check if user has specific permission
SELECT check_user_permission(
  p_user_id := $1,
  p_action := $2,
  p_resource := $3,
  p_resource_id := $4
);
```

3. **Get User's Tenants**
```sql
-- Get all tenants for a user
SELECT t.*, ut.is_primary
FROM tenants t
JOIN user_tenants ut ON t.id = ut.tenant_id
WHERE ut.user_id = auth.uid()
ORDER BY ut.is_primary DESC, t.name;
```

## Data Integrity Rules

### Referential Integrity
- Foreign keys with appropriate CASCADE rules
- Orphan record prevention
- Consistent deletion patterns

### Business Logic Constraints
1. Users must have at least one tenant
2. Each user has exactly one primary tenant
3. System roles cannot be modified by users
4. Permissions are immutable once created
5. Audit logs are append-only

### Validation Rules
- Email uniqueness across system
- Tenant slug uniqueness
- Role name uniqueness within tenant
- Resource + Action uniqueness for permissions

## Performance Considerations

### Indexes
Strategic indexes on:
- Foreign key columns
- Frequently queried fields
- Composite indexes for common join patterns

### Query Optimization
- Tenant ID filtering in all queries
- Proper join order for multi-table queries  
- Materialized views for complex permission checks

## Migration Considerations

### Schema Evolution
- Additive changes preferred
- Backward compatibility maintained
- Feature flags for breaking changes

### Data Migration Patterns
- Batch processing for large datasets
- Tenant-by-tenant migration support
- Rollback procedures for all changes

## Security Considerations

### Data Protection
- Tenant isolation through RLS
- Encrypted sensitive data
- Audit trail for compliance

### Access Control
- Permission-based access
- Role hierarchy support
- Temporary permission grants

## Related Documentation

- [DATABASE_IMPLEMENTATION.md](../../src/docs/data-model/entity-relationships/DATABASE_IMPLEMENTATION.md)
- [MULTI_TENANT_QUERIES.md](../../src/docs/data-model/entity-relationships/MULTI_TENANT_QUERIES.md)
- [USER_IDENTITY_RELATIONSHIPS.md](../../src/docs/data-model/entity-relationships/USER_IDENTITY_RELATIONSHIPS.md)
- [RBAC_RELATIONSHIPS.md](../../src/docs/data-model/entity-relationships/RBAC_RELATIONSHIPS.md)
- [AUDIT_RELATIONSHIPS.md](../../src/docs/data-model/entity-relationships/AUDIT_RELATIONSHIPS.md)

## Version History

- **1.0.0** (2025-05-26): Initial comprehensive documentation
