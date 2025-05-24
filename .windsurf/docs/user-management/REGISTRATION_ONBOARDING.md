
# User Registration and Onboarding

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the user registration and onboarding processes, including self-registration flows, administrator-initiated registration, and the complete onboarding journey.

## Registration Flows

### Self-Registration

The system supports open user self-registration with configurable controls:

1. **Open Signup with Email Verification**:
   - User provides email and basic information
   - Verification email sent with confirmation link
   - Account remains pending until verified

2. **Optional Approval Workflows**:
   - Admin approval requirement option
   - Domain-based auto-approval rules
   - Multi-level approval workflows

3. **Domain-Based Tenant Assignment**:
   - Email domain mapping to tenants
   - Automatic tenant assignment based on email
   - Domain verification for tenant creation

```typescript
// Self-registration flow configuration
interface SelfRegistrationConfig {
  requireEmailVerification: boolean;
  requireAdminApproval: boolean;
  allowedDomains: string[] | null; // null means any domain allowed
  autoAssignTenantByDomain: boolean;
  defaultTenantId: string | null;
  defaultRoleId: string;
}

// Example domain to tenant mapping
interface DomainTenantMapping {
  domain: string;
  tenantId: string;
  autoApprove: boolean;
}
```

### Administrator-Initiated Registration

Administrators can create users through various methods:

1. **Invite-Based Registration**:
   - Admin creates user invitation
   - Email sent with registration link
   - Pre-assigned roles and tenants
   - Expiring invitation links

2. **Bulk User Import**:
   - CSV/Excel import functionality
   - Mapping template for data fields
   - Validation and error reporting
   - Optional notification emails

3. **Just-in-Time Provisioning**:
   - User creation during SSO/SAML login
   - Attribute mapping from IdP
   - Role assignment based on identity provider attributes
   - Tenant assignment from identity context

```typescript
// User invitation interface
interface UserInvitation {
  email: string;
  roleIds: string[];
  tenantIds: string[];
  expiresAt: Date;
  invitedBy: string;
  message?: string;
}

// Bulk import mapping
interface UserImportMapping {
  emailColumn: string;
  firstNameColumn?: string;
  lastNameColumn?: string;
  roleColumn?: string;
  tenantColumn?: string;
  departmentColumn?: string;
  defaultRole?: string;
  defaultTenant?: string;
}
```

## Onboarding Process

### Account Activation

The activation process ensures secure user onboarding:

1. **Email Verification**:
   - Unique verification tokens
   - Limited-time validity
   - Secure token handling
   - Re-sending capabilities

2. **Initial Password Setup**:
   - Password strength requirements
   - Password confirmation
   - Password policy display
   - Secure password transmission

3. **Profile Completion Requirements**:
   - Required profile fields
   - Progressive profile completion
   - Completion status tracking
   - Field validation

### Tenant Assignment

Users are assigned to tenants through various mechanisms:

1. **Default Tenant Rules**:
   - System-level default tenant
   - Registration-source default tenant
   - Domain-based assignment rules

2. **Multi-Tenant User Provisioning**:
   - Single user in multiple tenants
   - Different roles per tenant
   - Tenant-specific profile data
   - Primary tenant designation

3. **Role Assignment**:
   - Default role assignment
   - Role templates for common user types
   - Role assignment based on invitation
   - Role assignment based on SSO attributes

## Onboarding User Experience

### First-Time User Experience

The system guides new users through a structured onboarding flow:

1. **Welcome Sequence**:
   - Personalized welcome message
   - Guided tour of key features
   - Getting started documentation
   - Setup wizard for common tasks

2. **Profile Enhancement**:
   - Progressive profile completion prompts
   - Avatar/photo upload
   - Preference settings
   - Notification configuration

3. **Feature Discovery**:
   - Role-specific feature highlights
   - Contextual help resources
   - Interactive tutorials
   - Quick start guides

### Onboarding Flow Configuration

The onboarding experience can be customized per tenant:

```typescript
interface OnboardingFlowConfig {
  steps: OnboardingStep[];
  requiredSteps: string[];
  daysToComplete: number | null;
  reminderFrequency: number;
  completionAction: 'notify_admin' | 'restrict_access' | 'none';
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  componentType: 'profile_completion' | 'tutorial' | 'task' | 'survey';
  componentConfig: Record<string, unknown>;
  order: number;
  isRequired: boolean;
}
```

## Registration Security Controls

1. **Registration Throttling**:
   - Rate limiting for registration attempts
   - CAPTCHA for automated submission prevention
   - IP-based registration limits
   - Detection of bulk registration attempts

2. **Email Verification Integrity**:
   - Secure token generation
   - Limited token validity
   - One-time use tokens
   - Monitoring of verification patterns

3. **Invitation Security**:
   - One-time use invitation links
   - Expiring invitations
   - Limited validity period
   - Authentication before accepting invitation

## Related Documentation

- **[IDENTITY_ARCHITECTURE.md](IDENTITY_ARCHITECTURE.md)**: User identity components
- **[AUTHENTICATION.md](AUTHENTICATION.md)**: Authentication methods
- **[PROFILE_MANAGEMENT.md](PROFILE_MANAGEMENT.md)**: Profile management
- **[MULTITENANCY_INTEGRATION.md](MULTITENANCY_INTEGRATION.md)**: Tenant-specific user details
- **[../security/INPUT_VALIDATION.md](../security/INPUT_VALIDATION.md)**: Input validation security

## Version History

- **1.0.0**: Initial document created from user management refactoring (2025-05-22)
