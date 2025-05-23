# Multitenancy Architecture

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the multitenancy architecture for the application, defining how the system supports multiple tenants while maintaining data isolation, security, and performance. This architecture integrates with the existing RBAC system, resource framework, and testing infrastructure.

## Core Principles

The multitenancy architecture adheres to the following core principles:

1. **Complete Data Isolation**: Tenant data must be fully isolated with no possibility of cross-tenant data leakage
2. **Shared Infrastructure**: All tenants operate on a single database instance using row-level security for isolation
3. **Performance Independence**: Operations in one tenant should not impact performance for other tenants
4. **Consistent Authorization**: The RBAC system applies uniformly across all tenants with tenant-specific boundaries
5. **Extensible User Model**: Core user properties remain consistent while supporting tenant-specific extensions

## Tenant Model

### Tenant Definition

A tenant represents a distinct organization or entity with its own isolated set of data and users. Each tenant has:

1. **Tenant ID**: Globally unique identifier for the tenant
2. **Configuration**: Tenant-specific settings and feature flags
3. **Resource Quota**: Limits on resources the tenant can consume
4. **Subscription Tier**: Determines available features and limitations

### Tenant Data Model

```
tenants(
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  subscription_tier TEXT NOT NULL DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb
)
```

## User Model

For a comprehensive description of the core user model, please refer to the canonical [../user-management/CORE_USER_MODEL.md](../user-management/CORE_USER_MODEL.md) document. The following sections focus specifically on the tenant-specific aspects of the user model.

### Tenant-Specific User Extensions

User data is extended for specific tenants through:

1. **User-Tenant Association**:
   - Many-to-many relationship between users and tenants
   - Role assignments specific to each tenant
   - Tenant-specific user status

2. **Tenant-Specific Profile Extensions**:
   - Custom fields defined by tenant
   - Domain-specific attributes
   - Configurable validation rules

### User Data Model (Tenant-Specific)

```
// User-tenant association
user_tenants(
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, tenant_id)
)

// Tenant-specific profile extensions
tenant_user_profiles(
  id UUID PRIMARY KEY,
  user_tenant_id UUID NOT NULL REFERENCES user_tenants(id),
  profile_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)
```

## Integration with RBAC System

### Tenant-Specific Role Assignments

The RBAC system extends to support tenant context:

1. **Role-Tenant Scoping**:
   ```
   user_tenant_roles(
     id UUID PRIMARY KEY,
     user_tenant_id UUID NOT NULL REFERENCES user_tenants(id),
     role_id UUID NOT NULL REFERENCES roles(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     created_by UUID REFERENCES auth.users(id),
     UNIQUE(user_tenant_id, role_id)
   )
   ```

2. **Permission Resolution Across Tenants**:
   - Permissions are resolved within tenant context
   - Global permissions exist but are limited to system-level operations
   - Entity boundaries enforce tenant isolation

### Permission Boundary Enforcement

As described in [rbac/ENTITY_BOUNDARIES.md](rbac/ENTITY_BOUNDARIES.md), permission boundaries are enforced at both application and database levels:

1. **Database-Level Enforcement**:
   - Row-level security policies include tenant_id in conditions
   - Security definer functions prevent direct tenant data access

2. **Application-Level Enforcement**:
   - Tenant context included in all authenticated requests
   - Permission checks include tenant validation
   - Cross-tenant operations require specific permissions

## Authentication and Session Management

### Tenant-Aware Authentication

1. **Authentication Process**:
   - Users authenticate with email/password (tenant-agnostic)
   - After authentication, available tenants are determined
   - User selects active tenant or default is applied
   - Session includes tenant context

2. **Session Structure**:
   ```typescript
   interface TenantAwareSession {
     userId: string;
     email: string;
     activeTenantId: string;
     availableTenants: Array<{
       id: string;
       name: string;
     }>;
     permissions: ResourcePermission[];
     // Standard session properties
     expiresAt: number;
     refreshToken: string;
   }
   ```

3. **Tenant Switching**:
   - Users with access to multiple tenants can switch context
   - Switching updates session but maintains authentication
   - All permission checks are reevaluated on tenant switch

## Data Isolation Strategy

### Row-Level Security Implementation

1. **Tenant Isolation Policies**:
   All tenant-scoped tables implement RLS policies:

   ```sql
   -- Example RLS policy for tenant data isolation
   CREATE POLICY tenant_isolation_policy ON table_name
   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
   ```

2. **Cross-Tenant Access Control**:
   - SuperAdmin can access cross-tenant data through specific functions
   - All cross-tenant actions are logged in the audit system
   - Only designated system functions can bypass tenant isolation

### Query Optimization for Tenant Isolation

1. **Indexing Strategy**:
   - Tenant ID as first column in compound indices
   - Tenant-specific data access optimized through appropriate indexing
   - Query plans optimized for tenant-filtered queries

2. **Partitioning Strategy**:
   - Large tables partitioned by tenant_id for improved performance
   - Partition pruning ensures queries only scan relevant tenant data
   - Maintenance operations scoped to tenant-specific partitions

## Shared Resources Management

### Resource Sharing Models

1. **Global Resources**:
   - Available to all tenants without explicit tenant association
   - Read-only for most tenants
   - Examples: Country codes, currencies, system-wide reference data

2. **Tenant-Specific Resources**:
   - Owned by a specific tenant
   - Not accessible to other tenants
   - Examples: Customer records, orders, tenant-specific configurations

3. **Template Resources**:
   - Global templates cloned for tenant-specific customization
   - Modified independently by each tenant
   - Examples: Email templates, document templates, workflow definitions

### Access Patterns for Shared Resources

1. **Read Access**:
   - Direct read access for global resources
   - Function-based access for filtered shared resources
   - Tenant context enforced for all data access

2. **Write Access**:
   - Write access restricted by resource type and ownership
   - Global resources modified only by system administrators
   - Tenant resources modified only by tenant administrators

## System Administration

### Cross-Tenant Administration

1. **SuperAdmin Capabilities**:
   - Tenant creation and management
   - Cross-tenant user management
   - System-wide configuration
   - Resource quota management

2. **Tenant Administration**:
   - Scoped to specific tenant
   - User management within tenant
   - Role and permission management within tenant
   - Tenant-specific configuration

### Audit Logging for Cross-Tenant Operations

All cross-tenant operations are logged with:

1. **Context Information**:
   - User ID and tenant ID of operator
   - Target tenant ID for cross-tenant operations
   - Timestamp and operation details

2. **Audit Trail**:
   - Complete history of cross-tenant activities
   - Accessible to SuperAdmins and compliance officers
   - Immutable and tamper-evident logs

## Performance Considerations

### Tenant-Aware Caching Strategy

As referenced in [rbac/CACHING_STRATEGY.md](rbac/CACHING_STRATEGY.md), the caching system is extended for tenant isolation:

1. **Cache Namespacing**:
   - Cache keys prefixed with tenant ID
   - Separate cache regions per tenant
   - Tenant-specific cache invalidation

2. **Shared Cache Resources**:
   - Global resources cached once and shared
   - Tenant-specific resources cached separately
   - Cache size limits per tenant

### Query Performance Optimization

1. **Query Planning**:
   - Tenant-aware query execution plans
   - Statistics maintained per tenant for large tenants
   - Query parameter categorization for plan reuse

2. **Connection Pooling**:
   - Connection pools segregated by tenant for high-activity tenants
   - Dynamic allocation of database resources based on tenant activity
   - Resource limits enforced per tenant

## Testing Framework Integration

### Tenant-Aware Test Scenarios

The test scaffolding system described in [TEST_SCAFFOLDING.md](TEST_SCAFFOLDING.md) is extended to support multitenancy:

1. **Test Data Isolation**:
   - Test data created with tenant context
   - Tests run within isolated tenant environments
   - Cross-tenant test scenarios explicitly defined

2. **Tenant-Specific Test Factories**:
   ```typescript
   // Example of tenant-aware test factory
   export const createTestResource = (tenantId: string, overrides?: Partial<Resource>) => ({
     id: faker.string.uuid(),
     tenant_id: tenantId,
     name: faker.lorem.word(),
     // Other properties
     ...overrides
   });
   ```

3. **Multi-Tenant Test Scenarios**:
   - Tests for data isolation between tenants
   - Tests for proper permission resolution across tenants
   - Performance tests with multi-tenant load simulation

## Tenant Lifecycle Management

### Tenant Provisioning

1. **Provisioning Process**:
   - Tenant registration and validation
   - Database schema initialization
   - Default role and permission setup
   - System resource allocation

2. **Tenant Templates**:
   - Predefined configurations for different tenant types
   - Role templates and permission sets
   - Feature enablement based on subscription tier

### Tenant Data Migration

1. **Migration Scenarios**:
   - Tenant tier upgrades/downgrades
   - Tenant consolidation
   - Tenant data archiving

2. **Migration Security**:
   - Permission verification for migration operations
   - Complete audit trail of migration activities
   - Data validation before and after migration

## Related Documentation

- **[../user-management/CORE_USER_MODEL.md](../user-management/CORE_USER_MODEL.md)**: Canonical core user model
- **[../user-management/README.md](../user-management/README.md)**: User management system overview
- **[rbac/README.md](rbac/README.md)**: RBAC system overview and integration
- **[rbac/ENTITY_BOUNDARIES.md](rbac/ENTITY_BOUNDARIES.md)**: Entity-level permission isolation
- **[rbac/PERMISSION_TYPES.md](rbac/PERMISSION_TYPES.md)**: Permission taxonomy
- **[TEST_FRAMEWORK.md](TEST_FRAMEWORK.md)**: Overall testing architecture
- **[TEST_SCAFFOLDING.md](TEST_SCAFFOLDING.md)**: Automated test generation
- **[CORE_ARCHITECTURE.md](CORE_ARCHITECTURE.md)**: Core system architecture
- **[RESOURCE_REGISTRATION.md](RESOURCE_REGISTRATION.md)**: Resource registration process
- **[security/MULTI_TENANT_ROLES.md](security/MULTI_TENANT_ROLES.md)**: Tenant-specific role management

## Version History

- **1.1.0**: Updated to reference user-management/CORE_USER_MODEL.md as the canonical source for core user model definitions
- **1.0.0**: Initial multitenancy architecture document
