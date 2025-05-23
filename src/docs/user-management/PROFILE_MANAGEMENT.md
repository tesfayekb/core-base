
# Profile Management

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the user profile management system, including profile components, update permissions, and validation rules.

## User Profile Components

### Base Profile

The core profile information that is consistent across all tenants:

1. **Personal Information**:
   - Full name
   - Email address (linked to authentication)
   - Profile picture/avatar
   - Basic contact information

2. **Account Metadata**:
   - Account creation date
   - Last login timestamp
   - Last profile update
   - Account status

3. **Communication Preferences**:
   - Email notification settings
   - Language preference
   - Time zone
   - Date format preference

### Security Profile

User security settings managed at the global level:

1. **Password Management**:
   - Password last changed
   - Password expiration date
   - Password history
   - Password strength indicator

2. **Multi-Factor Authentication**:
   - MFA enabled status
   - Registered MFA methods
   - Recovery codes
   - Trusted devices

3. **Session Preferences**:
   - Session timeout duration
   - Remember device settings
   - Active sessions list
   - Session termination options

### Tenant-Specific Profiles

Extended profile information that varies by tenant:

1. **Organizational Information**:
   - Department
   - Job title
   - Employee ID
   - Reporting structure

2. **Tenant Preferences**:
   - Default views
   - Dashboard configuration
   - Feature opt-in/opt-out
   - Notification routing

3. **Custom Fields**:
   - Tenant-defined fields
   - Extensible schema
   - Field validation rules
   - Field visibility controls

## Profile Data Model

```typescript
// Base user profile
interface BaseUserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt?: Date;
  status: 'active' | 'inactive' | 'suspended';
  communicationPreferences: {
    emailNotifications: boolean;
    language: string;
    timezone: string;
    dateFormat: string;
  };
}

// Security profile
interface SecurityProfile {
  userId: string;
  passwordLastChanged?: Date;
  passwordExpiresAt?: Date;
  mfaEnabled: boolean;
  mfaMethods: Array<{
    type: 'totp' | 'sms' | 'email';
    value: string;
    isDefault: boolean;
  }>;
  sessionTimeoutMinutes: number;
  trustedDevices: Array<{
    deviceId: string;
    deviceName: string;
    lastActive: Date;
  }>;
}

// Tenant-specific profile
interface TenantUserProfile {
  id: string;
  userTenantId: string;
  department?: string;
  jobTitle?: string;
  employeeId?: string;
  reportsTo?: string;
  tenantPreferences: {
    defaultView?: string;
    dashboardConfig?: Record<string, unknown>;
    featureSettings?: Record<string, boolean>;
  };
  customFields: Record<string, unknown>; // Tenant-defined fields
}
```

## Profile Update Permissions

### Self-Service Updates

Fields that users can update without special permissions:

1. **Personal Information Updates**:
   - Name
   - Profile picture
   - Contact information
   - Communication preferences

2. **Preference Management**:
   - User interface preferences
   - Notification settings
   - Language and locale
   - Session settings

3. **Security Settings**:
   - Password changes
   - MFA configuration
   - Trusted devices
   - Active sessions

### Administrative Updates

Fields that require administrative permissions:

1. **Account Status Changes**:
   - Activation/deactivation
   - Suspension/reinstatement
   - Account deletion
   - Access restoration

2. **Role Assignments**:
   - Role granting
   - Role revocation
   - Permission overrides
   - Special access grants

3. **Organizational Settings**:
   - Department assignment
   - Reporting structure
   - System-critical attributes
   - Compliance-related fields

## Profile Validation and Security

### Field Validation

All profile fields are subject to validation rules:

1. **Format Validation**:
   - Email format validation
   - Phone number formatting
   - Required field enforcement
   - Length constraints

2. **Business Rule Validation**:
   - Unique constraint checking
   - Referential integrity
   - Logical consistency
   - Temporal validity

3. **Custom Field Validation**:
   - Tenant-defined validation rules
   - Dynamic schema validation
   - Type checking
   - Range constraints

### Data Protection

Profile information is protected through:

1. **Field-Level Security**:
   - Attribute-based access control
   - Field visibility rules
   - Data masking for sensitive fields
   - Conditional display logic

2. **Audit Logging**:
   - Profile change tracking
   - Field-level change history
   - Change attribution
   - Timestamp records

3. **Encryption**:
   - Encrypted storage for sensitive fields
   - TLS for data in transit
   - Encryption key management
   - Compliance with data protection regulations

## Profile Extension Mechanisms

### Tenant-Specific Extensions

Tenants can extend user profiles through:

1. **Custom Fields Schema**:
   ```typescript
   interface CustomFieldDefinition {
     key: string;
     label: string;
     type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
     required: boolean;
     defaultValue?: any;
     options?: Array<{value: string; label: string}>;
     validation?: {
       min?: number;
       max?: number;
       pattern?: string;
       custom?: string; // JSON schema or function name
     };
     visibility: 'public' | 'tenant' | 'admin_only';
     section?: string;
     order: number;
   }
   ```

2. **Profile Section Customization**:
   - Custom section definitions
   - Field grouping
   - Section ordering
   - Conditional display rules

3. **Integration Fields**:
   - External system identifiers
   - Integration-specific data
   - Synchronization metadata
   - External reference mappings

## Related Documentation

- **[IDENTITY_ARCHITECTURE.md](IDENTITY_ARCHITECTURE.md)**: User identity components
- **[RBAC_INTEGRATION.md](RBAC_INTEGRATION.md)**: Role-based access control
- **[MULTITENANCY_INTEGRATION.md](MULTITENANCY_INTEGRATION.md)**: Tenant-specific profiles
- **[AUDIT_SECURITY.md](AUDIT_SECURITY.md)**: Profile data security
- **[../data-model/entity-relationships/USER_IDENTITY_MODEL.md](../data-model/entity-relationships/USER_IDENTITY_MODEL.md)**: Entity relationships

## Version History

- **1.0.0**: Initial document created from user management refactoring (2025-05-22)
