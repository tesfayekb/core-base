
# AI Structured Knowledge

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

This document provides structured representations of key relationships and entities in the system, designed to be easily parsed and understood by AI development platforms.

## Entity Relationships

```yaml
# Core entity relationships in JSON format
{
  "entities": {
    "User": {
      "relationships": {
        "Roles": {"type": "many-to-many", "through": "UserRoles"},
        "Tenants": {"type": "many-to-many", "through": "UserTenants"},
        "Resources": {"type": "one-to-many", "as": "creator"}
      },
      "attributes": ["id", "email", "passwordHash", "firstName", "lastName", "status"]
    },
    "Role": {
      "relationships": {
        "Users": {"type": "many-to-many", "through": "UserRoles"},
        "Permissions": {"type": "many-to-many", "through": "RolePermissions"},
        "Tenant": {"type": "many-to-one", "nullable": true}
      },
      "attributes": ["id", "name", "description", "isSystem", "tenantId"]
    },
    "Permission": {
      "relationships": {
        "Roles": {"type": "many-to-many", "through": "RolePermissions"},
        "Resource": {"type": "many-to-one"}
      },
      "attributes": ["id", "resourceId", "action"]
    },
    "Resource": {
      "relationships": {
        "Permissions": {"type": "one-to-many"},
        "Creator": {"type": "many-to-one", "entity": "User"}
      },
      "attributes": ["id", "name", "description", "isSystem"]
    },
    "Tenant": {
      "relationships": {
        "Users": {"type": "many-to-many", "through": "UserTenants"},
        "Roles": {"type": "one-to-many"},
        "Resources": {"type": "one-to-many"}
      },
      "attributes": ["id", "name", "status", "settings"]
    }
  }
}
```

## Permission System Schema

```yaml
# Permission system schema in JSON format
{
  "permissionSystem": {
    "model": "direct-assignment", 
    "inheritanceType": "none",
    "permissionTypes": [
      {"name": "View", "description": "View a single resource"},
      {"name": "ViewAny", "description": "View all resources of this type"},
      {"name": "Create", "description": "Create a new resource"},
      {"name": "Update", "description": "Update an existing resource"},
      {"name": "Delete", "description": "Delete a single resource"},
      {"name": "DeleteAny", "description": "Delete any resources of this type"},
      {"name": "Restore", "description": "Restore a soft-deleted resource"},
      {"name": "Replicate", "description": "Duplicate a resource"},
      {"name": "Export", "description": "Export resource data"},
      {"name": "Import", "description": "Import resource data"},
      {"name": "BulkEdit", "description": "Mass update resources"},
      {"name": "BulkDelete", "description": "Mass delete resources"},
      {"name": "Manage", "description": "Administrative permission"}
    ],
    "systemRoles": [
      {"name": "SuperAdmin", "description": "Complete system access"},
      {"name": "BasicUser", "description": "Minimal access permissions"}
    ],
    "functionalDependencies": {
      "Update": ["View"],
      "Delete": ["View"],
      "DeleteAny": ["ViewAny"],
      "BulkEdit": ["Update", "ViewAny"],
      "BulkDelete": ["Delete", "ViewAny"],
      "Manage": ["View", "ViewAny", "Create", "Update", "Delete"]
    },
    "resolutionAlgorithm": "directUnion"
  }
}
```

## Multi-Tenant Architecture

```yaml
# Multi-tenant architecture in JSON format
{
  "multiTenancy": {
    "model": "row-level-isolation",
    "tenantIdentifier": "tenant_id",
    "boundaryEnforcement": [
      {"layer": "database", "mechanism": "row-level-security"},
      {"layer": "service", "mechanism": "context-validation"},
      {"layer": "api", "mechanism": "tenant-header"}
    ],
    "crossTenantAccess": {
      "permitTypes": ["view", "manage", "full_access"],
      "auditRequirement": "mandatory"
    },
    "dataIsolation": {
      "default": "strict",
      "exceptions": ["shared_reference_data", "global_configuration"]
    },
    "sessionManagement": {
      "contextStorage": "session",
      "contextSwitching": "explicit"
    }
  }
}
```

## Core System Integration Points

```yaml
# System integration points in JSON format
{
  "integrationPoints": [
    {
      "name": "rbac-security",
      "primarySystem": "rbac",
      "secondarySystem": "security",
      "documentationPath": "integration/SECURITY_RBAC_INTEGRATION.md",
      "interfaces": ["PermissionCheckService", "RoleValidationService"]
    },
    {
      "name": "rbac-audit",
      "primarySystem": "rbac",
      "secondarySystem": "audit",
      "documentationPath": "integration/RBAC_AUDIT_INTEGRATION.md",
      "interfaces": ["PermissionChangeLogger", "AccessAttemptLogger"]
    },
    {
      "name": "security-audit",
      "primarySystem": "security",
      "secondarySystem": "audit",
      "documentationPath": "integration/SECURITY_AUDIT_INTEGRATION.md",
      "interfaces": ["SecurityEventLogger", "AuthenticationLogger"]
    },
    {
      "name": "multitenancy-rbac",
      "primarySystem": "multitenancy",
      "secondarySystem": "rbac",
      "documentationPath": "rbac/ENTITY_BOUNDARIES.md",
      "interfaces": ["TenantPermissionResolver", "CrossTenantAuthorizer"]
    },
    {
      "name": "multitenancy-data",
      "primarySystem": "multitenancy",
      "secondarySystem": "data-model",
      "documentationPath": "multitenancy/DATA_ISOLATION.md",
      "interfaces": ["TenantQueryFilter", "TenantDataValidator"]
    }
  ]
}
```

## Documentation Relationship Graph

```yaml
# Documentation relationship graph in JSON format
{
  "documentationMap": {
    "nodes": [
      {"id": "core", "name": "Core Architecture", "path": "CORE_ARCHITECTURE.md"},
      {"id": "rbac", "name": "RBAC System", "path": "RBAC_SYSTEM.md"},
      {"id": "security", "name": "Security System", "path": "security/README.md"},
      {"id": "audit", "name": "Audit System", "path": "audit/README.md"},
      {"id": "multitenancy", "name": "Multi-Tenant System", "path": "multitenancy/README.md"},
      {"id": "mobile", "name": "Mobile Implementation", "path": "mobile/README.md"},
      {"id": "testing", "name": "Testing Framework", "path": "TEST_FRAMEWORK.md"},
      {"id": "integration", "name": "Integration", "path": "integration/README.md"},
      {"id": "implementation", "name": "Implementation", "path": "implementation/README.md"}
    ],
    "edges": [
      {"from": "core", "to": "rbac", "type": "depends-on"},
      {"from": "core", "to": "security", "type": "depends-on"},
      {"from": "core", "to": "multitenancy", "type": "depends-on"},
      {"from": "rbac", "to": "security", "type": "bidirectional"},
      {"from": "rbac", "to": "audit", "type": "emits-events"},
      {"from": "security", "to": "audit", "type": "emits-events"},
      {"from": "multitenancy", "to": "rbac", "type": "enforces"},
      {"from": "mobile", "to": "security", "type": "depends-on"},
      {"from": "mobile", "to": "rbac", "type": "uses"},
      {"from": "testing", "to": "integration", "type": "verifies"},
      {"from": "implementation", "to": "core", "type": "implements"}
    ]
  }
}
```

## Type Definitions

```typescript
// Core type definitions

/**
 * User entity
 */
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: 'active' | 'inactive' | 'pending' | 'locked';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role entity
 */
interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission entity
 */
interface Permission {
  id: string;
  resourceId: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resource entity
 */
interface Resource {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant entity
 */
interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission request context
 */
interface PermissionContext {
  userId: string;
  tenantId?: string;
  resourceType: string;
  action: string;
  resourceId?: string;
}

/**
 * Audit event
 */
interface AuditEvent {
  id: string;
  eventType: string;
  userId?: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  status?: 'success' | 'failed' | 'error' | 'denied';
  metadata?: Record<string, any>;
  timestamp: Date;
  environmentId: string;
  applicationVersion: string;
}
```

## Related Documentation

- **[AI_DEVELOPMENT_GUIDE.md](AI_DEVELOPMENT_GUIDE.md)**: Navigation guide for AI platforms
- **[AI_IMPLEMENTATION_EXAMPLES.md](AI_IMPLEMENTATION_EXAMPLES.md)**: Code examples of key concepts
- **[CROSS_REFERENCE_STANDARDS.md](CROSS_REFERENCE_STANDARDS.md)**: Documentation linking conventions
- **[VERSION_COMPATIBILITY.md](VERSION_COMPATIBILITY.md)**: Version compatibility matrix

## Version History

- **1.0.0**: Initial structured knowledge representation (2025-05-22)
