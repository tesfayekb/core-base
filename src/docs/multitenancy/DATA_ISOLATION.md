# Multitenancy Data Isolation

> **Version**: 1.2.0  
> **Last Updated**: 2025-05-22

## Overview

This document outlines the data isolation strategies implemented within the multitenancy architecture. It defines how tenant data is segregated, secured, and optimized for performance while ensuring complete isolation between tenants.

## Data Isolation Principles

The multitenancy data isolation strategy is built on these core principles:

1. **Complete Isolation**: Tenant data must be fully isolated with no possibility of data leakage
2. **Defense in Depth**: Multiple layers of security enforce isolation
3. **Performance Balance**: Isolation mechanisms designed to minimize performance impact
4. **Isolation Verification**: Automated testing ensures isolation boundaries are maintained

## Row-Level Security Implementation

### Core RLS Strategy

Row-Level Security (RLS) serves as the primary isolation mechanism **consistently applied across all resource types**:

1. **Tenant Context Management**:
   ```sql
   -- Set tenant context function
   CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
   RETURNS VOID AS $$
   BEGIN
     PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   
   -- Get current tenant function (safely)
   CREATE OR REPLACE FUNCTION current_tenant_id()
   RETURNS UUID AS $$
   BEGIN
     RETURN nullif(current_setting('app.current_tenant_id', true), '')::UUID;
   END;
   $$ LANGUAGE plpgsql STABLE;
   ```

2. **Standard RLS Policy**:
   ```sql
   -- Standard tenant isolation policy example
   CREATE POLICY tenant_isolation_policy ON tenant_scoped_table
   USING (tenant_id = current_tenant_id());
   ```

3. **Security Definer Functions**:
   ```sql
   -- Example security definer function for cross-tenant operations
   CREATE OR REPLACE FUNCTION get_user_tenant_count(target_tenant_id UUID)
   RETURNS INTEGER AS $$
   DECLARE
     user_count INTEGER;
   BEGIN
     -- Verify current user has permission for this operation
     IF NOT has_permission(auth.uid(), 'ViewAny', 'user') THEN
       RAISE EXCEPTION 'Permission denied';
     END IF;
     
     -- Perform the cross-tenant query
     SELECT COUNT(*) INTO user_count
     FROM user_tenants
     WHERE tenant_id = target_tenant_id;
     
     RETURN user_count;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

### Standardized RLS Implementation Across Resource Types

To ensure consistent isolation across all resource types, the system implements:

1. **Uniform Isolation Pattern**
   All tenant-scoped tables follow this consistent pattern:
   
   ```sql
   -- Enable RLS on table
   ALTER TABLE {resource_table} ENABLE ROW LEVEL SECURITY;
   
   -- Force RLS even for table owners
   ALTER TABLE {resource_table} FORCE ROW LEVEL SECURITY;
   
   -- Apply standard tenant isolation policy
   CREATE POLICY "{resource}_tenant_isolation" ON {resource_table}
   FOR ALL USING (tenant_id = current_tenant_id());
   
   -- Apply any additional resource-specific policies
   -- e.g., ownership, role-based access, etc.
   ```

2. **Resource Type Categories**
   
   All resources fall into one of these categories with standardized isolation enforcement:
   
   a. **Tenant-Owned Resources**: Resources belonging to a single tenant
      - Standard tenant isolation policy using `tenant_id`
      - Example: customer records, tenant-specific configurations
   
   b. **Shared Resources**: Resources available across tenants
      - No tenant_id column
      - Access controlled through permission checks
      - Example: global reference data
   
   c. **User-Owned Resources**: Resources belonging to a specific user within a tenant
      - Combined tenant isolation (`tenant_id`) and user ownership (`created_by`) checks
      - Example: user preferences, personal dashboards

### Enabling RLS on Tables

All tenant-scoped tables consistently implement RLS:

```sql
-- Enable RLS on table
ALTER TABLE tenant_scoped_table ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE tenant_scoped_table FORCE ROW LEVEL SECURITY;
```

### Standard RLS Policy Patterns

1. **Basic Tenant Isolation**:
   ```sql
   -- Users can only access rows in their current tenant context
   CREATE POLICY tenant_isolation ON tenant_scoped_table
   FOR ALL USING (tenant_id = current_tenant_id());
   ```

2. **Owner-Based Access**:
   ```sql
   -- Users can only access their own data within tenant
   CREATE POLICY owner_access ON tenant_scoped_table
   FOR ALL USING (
     tenant_id = current_tenant_id() 
     AND created_by = auth.uid()
   );
   ```

3. **Role-Based Access**:
   ```sql
   -- Only managers can access certain data within tenant
   CREATE POLICY manager_access ON tenant_scoped_table
   FOR SELECT USING (
     tenant_id = current_tenant_id() 
     AND EXISTS (
       SELECT 1 FROM user_tenant_roles utr
       JOIN user_tenants ut ON utr.user_tenant_id = ut.id
       JOIN roles r ON utr.role_id = r.id
       WHERE ut.user_id = auth.uid()
       AND ut.tenant_id = tenant_scoped_table.tenant_id
       AND r.name = 'manager'
     )
   );
   ```

## Tenant Context Management

### Secure Tenant Context Management

To maintain secure tenant boundaries during context switching, the system implements:

1. **Explicit Tenant Context Management**
   
   ```typescript
   // Tenant context management service
   class TenantContextService {
     // Current tenant context
     private _currentTenantId: string | null = null;
     
     // Set current tenant context
     async setTenantContext(tenantId: string): Promise<boolean> {
       // Verify user has access to this tenant
       const { data, error } = await supabase
         .from('user_tenants')
         .select('id')
         .eq('user_id', supabase.auth.user()?.id)
         .eq('tenant_id', tenantId)
         .eq('is_active', true)
         .single();
       
       if (error || !data) {
         console.error('Tenant access denied:', error);
         return false;
       }
       
       // Set tenant context in database session
       await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
       
       // Update local tenant context
       this._currentTenantId = tenantId;
       
       // Log tenant switch for audit
       await this.logTenantSwitch(tenantId);
       
       return true;
     }
     
     // Get current tenant context
     getCurrentTenantId(): string | null {
       return this._currentTenantId;
     }
     
     // Clear tenant context
     async clearTenantContext(): Promise<void> {
       await supabase.rpc('set_tenant_context', { tenant_id: null });
       this._currentTenantId = null;
     }
     
     // Log tenant switch for audit
     private async logTenantSwitch(tenantId: string): Promise<void> {
       await supabase
         .from('tenant_switch_logs')
         .insert({
           user_id: supabase.auth.user()?.id,
           tenant_id: tenantId,
           ip_address: window.clientIP, // Set by middleware
           user_agent: navigator.userAgent
         });
     }
   }
   ```

2. **Tenant Boundary Enforcement During Switching**
   
   For each tenant switch:
   
   - Verify user has access to requested tenant
   - Clear all permission caches to force recalculation
   - Re-establish database session context
   - Log switch event for security audit
   - Re-evaluate all permission-dependent UI elements

3. **Session Handling for Tenant Context**

   ```typescript
   // Session with tenant context
   interface TenantAwareSession {
     userId: string;
     email: string;
     activeTenantId: string;
     availableTenants: Array<{
       id: string;
       name: string;
     }>;
     permissions: string[]; // Permissions for current tenant context
     expiresAt: number;
   }
   
   // Initialize session with tenant context
   const initializeTenantSession = async (): Promise<TenantAwareSession | null> => {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return null;
     
     // Get user's tenants
     const { data: tenants } = await supabase
       .from('user_tenants')
       .select('tenant_id, tenants(id, name)')
       .eq('user_id', user.id)
       .eq('is_active', true);
     
     if (!tenants?.length) return null;
     
     // Default to first tenant if no active tenant
     const defaultTenantId = tenants[0].tenant_id;
     
     // Set tenant context
     await supabase.rpc('set_tenant_context', { 
       tenant_id: defaultTenantId 
     });
     
     // Get permissions for current tenant
     const { data: permissions } = await supabase
       .rpc('get_user_permissions_in_tenant', { 
         tenant_id: defaultTenantId 
       });
     
     return {
       userId: user.id,
       email: user.email!,
       activeTenantId: defaultTenantId,
       availableTenants: tenants.map(t => ({
         id: t.tenants.id,
         name: t.tenants.name
       })),
       permissions: permissions || [],
       expiresAt: user.session.expires_at
     };
   };
   ```

## Cross-Tenant Operations

### Secure Implementation Patterns

1. **Security Definer Functions**:
   All cross-tenant operations use security definer functions:
   ```sql
   -- Copy template from one tenant to another
   CREATE OR REPLACE FUNCTION copy_template_cross_tenant(
     source_template_id UUID,
     source_tenant_id UUID,
     target_tenant_id UUID
   ) RETURNS UUID AS $$
   DECLARE
     new_template_id UUID;
   BEGIN
     -- Verify current user has cross-tenant admin permission
     PERFORM check_cross_tenant_permission();
     
     -- Create new template in target tenant
     INSERT INTO tenant_templates (
       tenant_id, name, description, content
     )
     SELECT
       target_tenant_id, name, description, content
     FROM
       tenant_templates
     WHERE
       id = source_template_id AND tenant_id = source_tenant_id
     RETURNING id INTO new_template_id;
     
     -- Log the cross-tenant operation
     INSERT INTO audit_logs (
       action, 
       actor_id, 
       source_tenant_id, 
       target_tenant_id,
       resource_type,
       resource_id,
       new_resource_id
     ) VALUES (
       'CROSS_TENANT_COPY',
       auth.uid(),
       source_tenant_id,
       target_tenant_id,
       'template',
       source_template_id,
       new_template_id
     );
     
     RETURN new_template_id;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. **Application-Level Control**:
   Cross-tenant functionality with explicit permission checks:
   ```typescript
   // Cross-tenant data transfer service
   class CrossTenantService {
     // Copy a resource from one tenant to another
     async copyResourceCrossTenant(sourceResourceId, sourceTenantId, targetTenantId) {
       // Check if user has cross-tenant admin permission
       const canAccessCrossTenant = await this.permissionService.checkPermission(
         'CrossTenantAdmin'
       );
       
       if (!canAccessCrossTenant) {
         throw new Error('Permission denied for cross-tenant operation');
       }
       
       // Perform cross-tenant copy via RPC
       const { data, error } = await supabase.rpc('copy_resource_cross_tenant', {
         source_resource_id: sourceResourceId,
         source_tenant_id: sourceTenantId,
         target_tenant_id: targetTenantId
       });
       
       if (error) throw error;
       
       return data;
     }
   }
   ```

### Audit Requirements

All cross-tenant operations must be thoroughly audited:

```sql
-- Cross-tenant audit table
CREATE TABLE cross_tenant_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  source_tenant_id UUID NOT NULL REFERENCES tenants(id),
  target_tenant_id UUID NOT NULL REFERENCES tenants(id),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  result_resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Always enable RLS
ALTER TABLE cross_tenant_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only compliance officers and super admins can view
CREATE POLICY compliance_access ON cross_tenant_audit_logs
FOR SELECT USING (
  has_permission(auth.uid(), 'ViewAny', 'audit_logs')
);
```

## User Profiles and Tenant-Specific Settings

### User Identity and Tenant Relationship Model

The system implements a clear separation between global user identity and tenant-specific user attributes:

1. **Global User Identity vs. Tenant-Scoped Profile Data**
   
   ```
   ┌───────────────────────┐          ┌───────────────────────┐
   │  Global User Identity │          │ Tenant-Specific Data  │
   ├───────────────────────┤          ├───────────────────────┤
   │ - Authentication      │          │ - Tenant A Profile    │
   │ - Core Profile        │◄─────────┤ - Tenant B Profile    │
   │ - Security Settings   │          │ - Tenant C Profile    │
   └───────────────────────┘          └───────────────────────┘
   ```

   - **Global Identity**: A single user identity exists across all tenants (auth.users, profiles)
   - **Tenant Membership**: User-tenant relationships define which tenants a user can access (user_tenants)
   - **Extended Profiles**: Tenant-specific user data extends the core profile but remains isolated (tenant_user_profiles)

2. **Isolation Architecture**

   - Each tenant has its own isolated storage for tenant-specific user settings
   - User settings for one tenant are completely inaccessible from other tenants
   - RLS policies enforce isolation based on tenant context

   ```sql
   -- Example of user profile tenant isolation policy
   CREATE POLICY tenant_isolation_policy ON tenant_user_profiles
   USING (tenant_id = current_tenant_id());
   ```

### Profile Data Classification

The system categorizes user data to ensure proper isolation:

1. **Global User Attributes** (Shared across all tenants)
   - Authentication credentials
   - Legal identity information 
   - Basic profile data (name, email, avatar)
   - Security settings (MFA, session preferences)
   - Account status (active, suspended)

2. **Tenant-Specific User Attributes** (Isolated per tenant)
   - Tenant-specific roles and permissions
   - User preferences within the tenant
   - Custom fields defined by tenant
   - Usage history and tenant-specific metrics
   - Tenant-specific notifications settings

### Data Mapping Between Global and Tenant-Specific Profiles

```typescript
// Data mapping architecture
interface GlobalUserProfile {
  id: string;                    // Global user identifier
  email: string;                 // Primary authentication method
  fullName: string;              // Legal/display name
  avatarUrl?: string;            // Profile picture
  lastGlobalSignIn: Date;        // Last global authentication
  securitySettings: {            // Global security configuration
    mfaEnabled: boolean;
    sessionTimeout: number;
  }
}

interface TenantUserProfile {
  id: string;                    // Tenant-user relationship ID
  userId: string;                // Reference to global user ID
  tenantId: string;              // Specific tenant context
  displayName?: string;          // Tenant-specific display name
  preferences: {                 // Tenant-specific preferences
    theme: string;
    notifications: NotificationSettings;
    dashboard: DashboardSettings;
  };
  customFields: Record<string, any>; // Tenant-defined fields
  lastTenantAccess: Date;        // Last access to this tenant
}
```

### Database Implementation

The database enforces strict separation between global and tenant-specific user data:

1. **Schema Implementation**

   ```sql
   -- Global user profiles (tenant-agnostic)
   CREATE TABLE profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     full_name TEXT,
     avatar_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   
   -- User-tenant relationships
   CREATE TABLE user_tenants (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     tenant_id UUID REFERENCES tenants(id) NOT NULL,
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     UNIQUE(user_id, tenant_id)
   );
   
   -- Tenant-specific user profiles
   CREATE TABLE tenant_user_profiles (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_tenant_id UUID REFERENCES user_tenants(id) NOT NULL,
     display_name TEXT,
     preferences JSONB DEFAULT '{}',
     custom_fields JSONB DEFAULT '{}',
     last_tenant_access TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   
   -- Enable RLS on tenant-specific profiles
   ALTER TABLE tenant_user_profiles ENABLE ROW LEVEL SECURITY;
   
   -- Apply tenant isolation policy
   CREATE POLICY tenant_isolation_policy ON tenant_user_profiles
     USING (
       EXISTS (
         SELECT 1 FROM user_tenants 
         WHERE id = tenant_user_profiles.user_tenant_id 
         AND tenant_id = current_tenant_id()
       )
     );
   ```

2. **Entity Relationship Diagram**

   ```mermaid
   erDiagram
       auth_users ||--|| profiles : "has one"
       auth_users ||--o{ user_tenants : "has many"
       user_tenants ||--|| tenant_user_profiles : "has one"
       tenants ||--o{ user_tenants : "has many"
       
       auth_users {
           uuid id PK
           string email
           string encrypted_password
       }
       
       profiles {
           uuid id PK
           text full_name
           text avatar_url
       }
       
       tenants {
           uuid id PK
           text name
       }
       
       user_tenants {
           uuid id PK
           uuid user_id FK
           uuid tenant_id FK
           boolean is_active
       }
       
       tenant_user_profiles {
           uuid id PK
           uuid user_tenant_id FK
           text display_name
           jsonb preferences
           jsonb custom_fields
       }
   ```

### Data Access Controls

The system implements multi-layered controls for user data access:

1. **Tenant Context Enforcement**
   - All queries to tenant_user_profiles require valid tenant context
   - Tenant context is validated through explicit user-tenant membership
   - Attempts to access profiles across tenant boundaries are blocked

2. **Application-Level Implementation**

   ```typescript
   // Profile data service with tenant isolation
   class TenantUserProfileService {
     // Get user profile in current tenant context
     async getUserProfile(userId: string): Promise<TenantUserProfile | null> {
       // Get current tenant context
       const tenantId = this.tenantContextService.getCurrentTenantId();
       if (!tenantId) {
         throw new Error('No tenant context established');
       }
       
       // Query with tenant context automatically applied through RLS
       const { data, error } = await supabase
         .from('tenant_user_profiles')
         .select('*, user_tenants!inner(*)')
         .eq('user_tenants.user_id', userId)
         .eq('user_tenants.tenant_id', tenantId)
         .single();
       
       if (error) {
         console.error('Error fetching tenant user profile:', error);
         return null;
       }
       
       return this.mapToTenantUserProfile(data);
     }
     
     // Update user profile in current tenant context
     async updateUserProfile(
       userId: string, 
       profileData: Partial<TenantUserProfile>
     ): Promise<boolean> {
       // Get current tenant context
       const tenantId = this.tenantContextService.getCurrentTenantId();
       if (!tenantId) {
         throw new Error('No tenant context established');
       }
       
       // First get the user-tenant relationship ID
       const { data: userTenant } = await supabase
         .from('user_tenants')
         .select('id')
         .eq('user_id', userId)
         .eq('tenant_id', tenantId)
         .single();
       
       if (!userTenant) {
         return false;
       }
       
       // Update the tenant-specific profile
       const { error } = await supabase
         .from('tenant_user_profiles')
         .update({
           display_name: profileData.displayName,
           preferences: profileData.preferences,
           custom_fields: profileData.customFields,
           updated_at: new Date()
         })
         .eq('user_tenant_id', userTenant.id);
       
       return !error;
     }
   }
   ```

### Profile Aggregation and Presentation

For UI presentation, the system combines global and tenant-specific profile data while maintaining isolation:

1. **Combined Profile View**

   ```typescript
   interface CombinedUserProfile {
     // Global identity (shared across tenants)
     id: string;
     email: string;
     fullName: string;
     avatarUrl?: string;
     
     // Tenant-specific extensions (isolated per tenant)
     currentTenant: {
       tenantId: string;
       tenantName: string;
       displayName?: string;
       role: string;
       preferences: Record<string, any>;
       customFields: Record<string, any>;
     };
   }
   
   // Profile aggregation service
   class UserProfileAggregationService {
     async getCombinedProfile(userId: string): Promise<CombinedUserProfile | null> {
       // Get global profile (tenant-agnostic)
       const globalProfile = await this.globalProfileService.getProfile(userId);
       if (!globalProfile) return null;
       
       // Get current tenant context
       const tenantId = this.tenantContextService.getCurrentTenantId();
       if (!tenantId) {
         // Return global profile only if no tenant context
         return {
           id: globalProfile.id,
           email: globalProfile.email,
           fullName: globalProfile.fullName,
           avatarUrl: globalProfile.avatarUrl,
           currentTenant: null
         };
       }
       
       // Get tenant-specific profile
       const tenantProfile = await this.tenantProfileService.getUserProfile(userId);
       
       // Get tenant details
       const tenant = await this.tenantService.getTenantById(tenantId);
       
       // Get user's role in this tenant
       const userRole = await this.roleService.getUserRoleInTenant(userId, tenantId);
       
       // Combine profiles while maintaining isolation
       return {
         // Global identity (from global profile)
         id: globalProfile.id,
         email: globalProfile.email,
         fullName: globalProfile.fullName, 
         avatarUrl: globalProfile.avatarUrl,
         
         // Tenant-specific data (from tenant profile)
         currentTenant: {
           tenantId,
           tenantName: tenant?.name || 'Unknown Tenant',
           displayName: tenantProfile?.displayName || globalProfile.fullName,
           role: userRole?.name || 'user',
           preferences: tenantProfile?.preferences || {},
           customFields: tenantProfile?.customFields || {}
         }
       };
     }
   }
   ```

## Related Documentation

- **[README.md](README.md)**: Multitenancy architecture overview
- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)**: Performance considerations
- **[../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)**: Entity-level permission isolation
- **[../user-management/README.md](../user-management/README.md)**: User management integration
- **[../user-management/MULTITENANCY_INTEGRATION.md](../user-management/MULTITENANCY_INTEGRATION.md)**: User management integration with multitenancy
- **[../user-management/CORE_USER_MODEL.md](../user-management/CORE_USER_MODEL.md)**: Core user model definition
- **[../TEST_FRAMEWORK.md](../TEST_FRAMEWORK.md)**: Testing framework overview

## Version History

- **1.2.0**: Added comprehensive section on user profiles and tenant-specific settings with implementation details (2025-05-22)
- **1.1.0**: Enhanced with standardized RLS implementation across resource types and secure tenant context switching (2025-05-22)
- **1.0.0**: Initial data isolation architecture document
