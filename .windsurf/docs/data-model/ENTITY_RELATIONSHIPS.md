
# Entity Relationship Documentation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines the entity relationships between key system components including users, roles, permissions, and tenants. It provides clear visual documentation of the data model to guide implementation.

## Core Entity Relationships

### User Authentication and Identity Model

```mermaid
erDiagram
    auth_users ||--|| profiles : "has one"
    auth_users ||--o{ user_roles : "has many"
    auth_users ||--o{ password_history : "has many"
    auth_users ||--o{ password_reset_tokens : "has many"
    auth_users ||--o{ user_settings : "has one"
    
    profiles {
        uuid id PK
        text full_name
        text avatar_url
        timestamp created_at
        timestamp updated_at
        timestamp last_sign_in_at
    }
    
    auth_users {
        uuid id PK
        string email
        string encrypted_password
        timestamp created_at
        timestamp last_sign_in_at
        jsonb raw_user_meta_data
    }
    
    password_history {
        uuid id PK
        uuid user_id FK
        text password_hash
        timestamp last_changed_at
        boolean requires_rotation
        timestamp created_at
    }
    
    password_reset_tokens {
        uuid id PK
        uuid user_id FK
        text token
        timestamp expires_at
        timestamp created_at
        timestamp used_at
    }
    
    user_settings {
        uuid id PK
        uuid user_id FK
        integer session_timeout_minutes
        timestamp created_at
        timestamp updated_at
    }
```

### Role-Based Access Control (RBAC) Model

```mermaid
erDiagram
    roles ||--o{ role_permissions : "has many"
    resources ||--o{ permissions : "has many"
    permissions ||--o{ role_permissions : "used in"
    user_roles }o--|| roles : "references"
    auth_users ||--o{ user_roles : "has many"
    resources ||--o{ resource_permission_actions : "has many"
    
    roles {
        uuid id PK
        text name
        text description
        boolean is_system_role
        timestamp created_at
        timestamp updated_at
    }
    
    resources {
        uuid id PK
        text name
        text description
        timestamp created_at
        timestamp updated_at
    }
    
    permissions {
        uuid id PK
        text action
        uuid resource_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    role_permissions {
        uuid id PK
        uuid role_id FK
        uuid permission_id FK
        uuid created_by FK
        timestamp created_at
    }
    
    resource_permission_actions {
        uuid id PK
        uuid resource_id FK
        text action_key
        text action_name
        text description
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    user_roles {
        uuid id PK
        uuid user_id FK
        uuid role_id FK
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
    }
```

### Multi-Tenant Data Model

```mermaid
erDiagram
    tenants ||--o{ user_tenants : "contains"
    user_tenants }o--|| auth_users : "references"
    tenants ||--o{ tenant_settings : "has"
    user_tenants ||--o{ tenant_user_settings : "has"
    tenants ||--o{ tenant_resources : "contains"
    
    tenants {
        uuid id PK
        text name
        text slug
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }
    
    user_tenants {
        uuid id PK
        uuid user_id FK
        uuid tenant_id FK
        uuid role_id FK
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    tenant_settings {
        uuid id PK
        uuid tenant_id FK
        text key
        jsonb value
        timestamp created_at
        timestamp updated_at
    }
    
    tenant_user_settings {
        uuid id PK
        uuid user_tenant_id FK
        text key
        jsonb value
        timestamp created_at
        timestamp updated_at
    }
    
    tenant_resources {
        uuid id PK
        uuid tenant_id FK
        text resource_type
        uuid resource_id
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
```

### Session and Context Management

```mermaid
erDiagram
    auth_users ||--o{ session_logs : "has"
    tenants ||--o{ session_context_changes : "referenced in"
    auth_users ||--o{ session_context_changes : "performs"
    
    session_logs {
        uuid id PK
        uuid user_id FK
        timestamp login_at
        timestamp logout_at
        text user_agent
        text ip_address
        text device_info
    }
    
    session_context_changes {
        uuid id PK
        uuid user_id FK
        uuid tenant_id FK
        text event_type
        jsonb metadata
        timestamp created_at
    }
```

## Cross-Entity Relationships

### User to Tenant Permission Flow

```mermaid
flowchart TD
    User[auth_users] -->|has| UserRoles[user_roles]
    User -->|belongs to| UserTenants[user_tenants]
    UserTenants -->|in| Tenant[tenants]
    UserTenants -->|has| TenantRole[roles]
    TenantRole -->|has| RolePermissions[role_permissions]
    RolePermissions -->|contains| Permissions[permissions]
    Permissions -->|for| Resources[resources]
    Resources -->|has| Actions[resource_permission_actions]
```

### Session Context Resolution

```mermaid
flowchart TD
    User[auth_users] -->|authenticates| Session[active_session]
    Session -->|sets| TenantContext[tenant_context]
    TenantContext -->|resolves| EffectivePermissions[effective_permissions]
    UserRoles[user_roles] -->|influences| EffectivePermissions
    TenantContext -->|scopes| DatabaseQueries[database_queries]
    TenantContext -->|applies| EntityBoundaries[entity_boundaries]
```

## Database Implementation

### Key Table Constraints and Relationships

1. **User Identity**:
   - `auth.users` is the primary identity table (managed by Supabase Auth)
   - `profiles` has a 1:1 relationship with `auth.users` via foreign key
   - User profile data is split across multiple tables for security and performance

2. **Role Assignment**:
   - `user_roles` contains global roles outside of tenant context
   - `user_tenants` associates users with tenants and tenant-specific roles
   - System ensures roles can only be assigned by users with appropriate permissions

3. **Permission Resolution**:
   - Permission checks follow the flow defined in [../rbac/PERMISSION_RESOLUTION.md](../rbac/PERMISSION_RESOLUTION.md)
   - Permissions are resolved through database functions that implement the canonical patterns
   - The resolution logic respects entity boundaries as defined in [../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)

## Query Patterns

The entity relationships dictate specific query patterns that must be followed for data consistency and security. All queries against tenant-bound entities must:

1. Always include tenant context as described in [../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md)
2. Apply Row-Level Security (RLS) policies based on the authenticated user and active tenant
3. Use session context functions for permission checks

Example pattern for tenant-scoped queries:

```sql
-- Function implementing canonical multi-tenant query pattern
CREATE OR REPLACE FUNCTION get_tenant_resources(tenant_id UUID)
RETURNS SETOF tenant_resources
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set tenant context
  PERFORM set_tenant_context(tenant_id);
  
  -- Return tenant resources (RLS will automatically filter based on context)
  RETURN QUERY SELECT * FROM tenant_resources;
END;
$$;
```

## Related Documentation

- **[../rbac/README.md](../rbac/README.md)**: RBAC system overview
- **[../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md)**: Canonical multi-tenant query patterns
- **[../multitenancy/SESSION_MANAGEMENT.md](../multitenancy/SESSION_MANAGEMENT.md)**: Session management in multi-tenant environments
- **[../integration/SESSION_AUTH_INTEGRATION.md](../integration/SESSION_AUTH_INTEGRATION.md)**: Session and authentication integration
- **[../security/MULTI_TENANT_ROLES.md](../security/MULTI_TENANT_ROLES.md)**: Multi-tenant role management

## Version History

- **1.0.0**: Initial entity relationship documentation (2025-05-22)
