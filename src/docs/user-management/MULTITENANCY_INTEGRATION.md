# Multitenancy Integration

> **Version**: 1.2.0  
> **Last Updated**: 2025-05-23

## Overview

This document outlines how the user management system integrates with the multitenancy architecture, focusing on cross-tenant user identity and tenant-specific user extensions.

## Cross-Tenant User Identity

### Global Identity, Local Context

The system maintains a single user identity across all tenants:

1. **Single Authentication Identity**:
   - One set of credentials for all tenants
   - Global authentication context
   - Unified sign-in experience
   - Cross-tenant session management

2. **Tenant-Specific Authorization**:
   - Different roles per tenant
   - Tenant-specific permissions
   - Context-aware permission evaluation
   - Permission isolation between tenants

3. **Profile Customization by Tenant**:
   - Core profile shared across tenants
   - Extended attributes per tenant
   - Tenant-specific settings
   - Isolated preference management

### Tenant Access Control

The system controls which tenants a user can access:

1. **Tenant Access Grants**:
   - Explicit user-tenant association required
   - Access request workflows
   - Invitations to tenants
   - Approval processes

2. **Tenant Access Management**:
   - Grant/revoke tenant access
   - Temporarily suspend tenant access
   - Transfer tenant ownership
   - Bulk tenant access operations

3. **Tenant Switching**:
   - Explicit tenant selection UI
   - Context persistence during session
   - Default tenant settings
   - Recent tenants list

```typescript
// User-tenant relationship management
interface UserTenantRelationship {
  id: string;
  userId: string;
  tenantId: string;
  roleId: string;
  status: 'active' | 'inactive' | 'pending_approval' | 'suspended';
  isDefault: boolean;
  joinedAt: Date;
  lastAccessedAt?: Date;
  metadata: Record<string, unknown>;
}

// Tenant switching service
class TenantContextService {
  // Get user's available tenants
  async getUserTenants(userId: string): Promise<UserTenantRelationship[]> {
    // Implementation...
  }
  
  // Switch active tenant
  async switchTenant(userId: string, tenantId: string): Promise<boolean> {
    // Check access
    const access = await this.checkTenantAccess(userId, tenantId);
    if (!access.hasAccess) return false;
    
    // Set tenant context
    await setTenantContext(userId, tenantId);
    
    // Update last access timestamp
    await this.updateLastAccess(userId, tenantId);
    
    // Log switch for audit
    await this.logTenantSwitch(userId, tenantId);
    
    return true;
  }
  
  // Set default tenant
  async setDefaultTenant(userId: string, tenantId: string): Promise<boolean> {
    // Implementation...
  }
}
```

## Tenant-Specific User Extensions

### Extension Mechanisms

The system allows tenants to extend user attributes:

1. **Tenant-Specific Profile Tables**:
   - Extended profile schema per tenant
   - Linked through user-tenant relationship
   - Isolated data storage
   - Tenant-controlled schema
   - For complete implementation details, see [../multitenancy/DATA_ISOLATION.md#user-profiles-and-tenant-specific-settings](../multitenancy/DATA_ISOLATION.md#user-profiles-and-tenant-specific-settings)
   - For concrete implementation examples, see [../multitenancy/IMPLEMENTATION_EXAMPLES.md#client-side-tenant-management](../multitenancy/IMPLEMENTATION_EXAMPLES.md#client-side-tenant-management)

2. **Custom Fields Schema**:
   - Tenant-defined field definitions
   - Dynamic schema interpretation
   - UI rendering based on schema
   - Custom validation rules

3. **Metadata Extensions**:
   - Flexible JSON data storage
   - Tenant-specific usage tracking
   - Integration metadata
   - Feature-specific settings

```typescript
// Tenant-specific profile extension
interface TenantUserProfileExtension {
  tenantId: string;
  schema: {
    version: number;
    lastUpdated: Date;
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'object';
      label: string;
      required: boolean;
      defaultValue?: any;
      options?: any[];
      validations?: Record<string, any>;
      displayOrder: number;
      section?: string;
    }>;
    sections: Array<{
      id: string;
      name: string;
      displayOrder: number;
    }>;
  };
}

// Runtime user profile with extensions
interface ExtendedUserProfile {
  baseProfile: BaseUserProfile;
  tenantProfile: {
    [field: string]: any; // Dynamic fields
  };
  extensionData: Record<string, unknown>;
}
```

### Extension Validation

The system enforces validation rules for extended data:

1. **Tenant-Defined Validation Rules**:
   - Field type validation
   - Required field validation
   - Range and pattern constraints
   - Custom validation functions

2. **Schema Enforcement**:
   - Runtime schema validation
   - Schema version tracking
   - Migration between schema versions
   - Invalid data handling

3. **Type Safety**:
   - Type checking for custom fields
   - Safe data access patterns
   - Default value handling
   - Null/undefined handling

```typescript
// Validation function for extended profile data
function validateExtendedProfile(
  data: Record<string, any>,
  schema: TenantUserProfileExtension['schema']
): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Check each field against schema
  for (const field of schema.fields) {
    const value = data[field.name];
    
    // Check required fields
    if (field.required && (value === undefined || value === null)) {
      errors[field.name] = `Field ${field.label} is required`;
      continue;
    }
    
    // Skip validation for undefined optional fields
    if (value === undefined) continue;
    
    // Type validation
    switch (field.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors[field.name] = `Field ${field.label} must be a string`;
        } else if (field.validations?.maxLength && value.length > field.validations.maxLength) {
          errors[field.name] = `Field ${field.label} exceeds maximum length`;
        }
        break;
        
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors[field.name] = `Field ${field.label} must be a number`;
        } else if (
          field.validations?.min !== undefined && 
          value < field.validations.min
        ) {
          errors[field.name] = `Field ${field.label} must be at least ${field.validations.min}`;
        }
        break;
        
      // Additional type validations...
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

## Multi-Tenant User Operations

### User Provisioning

User provisioning operations in multi-tenant environments:

1. **Cross-Tenant User Creation**:
   - Create user with tenant assignments
   - Role assignment per tenant
   - Default tenant setting
   - Welcome notification routing

2. **Tenant Membership Management**:
   - Add user to tenant
   - Remove user from tenant
   - Update tenant-specific roles
   - Transfer ownership between users

3. **Bulk Operations**:
   - Import users to multiple tenants
   - Export users from selected tenants
   - Cross-tenant user updates
   - Role synchronization across tenants

### Tenant-Aware Notifications

Notification handling across tenant boundaries:

1. **Notification Routing**:
   - Tenant-specific notification preferences
   - Cross-tenant notification aggregation
   - Notification priority across tenants
   - Tenant context in notifications

2. **Tenant Context Indicators**:
   - Clear tenant labeling in messages
   - Tenant branding in communications
   - Source tenant identification
   - Context switching from notifications

## Data Security

### Cross-Tenant Data Protection

Ensures isolation of user data between tenants:

1. **Tenant Data Isolation**:
   - Row-level security policies
   - Tenant context enforcement
   - Cross-tenant access prevention
   - Tenant boundary validation
   - Complete implementation details in [../multitenancy/DATA_ISOLATION.md#user-profiles-and-tenant-specific-settings](../multitenancy/DATA_ISOLATION.md#user-profiles-and-tenant-specific-settings)
   - Working examples in [../multitenancy/IMPLEMENTATION_EXAMPLES.md#database-query-layer-examples](../multitenancy/IMPLEMENTATION_EXAMPLES.md#database-query-layer-examples)

2. **Tenant-Specific Encryption**:
   - Separate encryption contexts
   - Tenant-specific encryption keys
   - Isolated secure storage
   - Key rotation per tenant

## Related Documentation

- **[IDENTITY_ARCHITECTURE.md](IDENTITY_ARCHITECTURE.md)**: User identity components
- **[RBAC_INTEGRATION.md](RBAC_INTEGRATION.md)**: Role assignment architecture
- **[../multitenancy/README.md](../multitenancy/README.md)**: Multitenancy architecture overview
- **[../multitenancy/DATA_ISOLATION.md](../multitenancy/DATA_ISOLATION.md)**: Tenant data isolation with comprehensive user profile isolation
- **[../multitenancy/IMPLEMENTATION_EXAMPLES.md](../multitenancy/IMPLEMENTATION_EXAMPLES.md)**: Concrete implementation examples for multi-tenant features
- **[../data-model/entity-relationships/MULTI_TENANT_MODEL.md](../data-model/entity-relationships/MULTI_TENANT_MODEL.md)**: Multi-tenant entity relationships

## Version History

- **1.2.0**: Added references to multi-tenant implementation examples (2025-05-23)
- **1.1.0**: Added references to enhanced user profiles and tenant-specific settings documentation (2025-05-22)
- **1.0.0**: Initial document created from user management refactoring (2025-05-22)
