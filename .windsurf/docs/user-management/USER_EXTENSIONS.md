
# User Extension Mechanisms

> **Version**: 1.2.0  
> **Last Updated**: 2025-05-22

## Overview

This document details the mechanisms for extending the core user model with tenant-specific and application-specific attributes. It complements the [CORE_USER_MODEL.md](CORE_USER_MODEL.md) document, which defines the fundamental user entity structure.

## Extension Mechanisms

### Tenant-Specific Extensions

User data is extended within tenant contexts through:

1. **Tenant Association**:
   ```
   user_tenants(
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     tenant_id UUID REFERENCES tenants(id),
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     UNIQUE(user_id, tenant_id)
   )
   ```

2. **Tenant-Specific Profiles**:
   ```
   tenant_user_profiles(
     id UUID PRIMARY KEY,
     user_tenant_id UUID REFERENCES user_tenants(id),
     custom_fields JSONB DEFAULT '{}'::jsonb,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   )
   ```

3. **Domain-Specific Extensions**:
   For specialized applications (e.g., HR systems, healthcare applications), additional dedicated tables can extend the user model with domain-specific attributes, always linking back to the core user identity.

### Extension Patterns

1. **Fixed Schema Extensions**:
   - Predefined columns for common extensions
   - Strong typing and validation
   - Example: `employee_user_profiles` with specific HR fields

2. **Dynamic Schema Extensions**:
   - JSONB columns for flexible attributes
   - Schema validation through application logic
   - Example: `custom_fields` JSONB column with tenant-defined schema

3. **Reference Extensions**:
   - Foreign key relationships to domain entities
   - Bidirectional references
   - Example: `user_specialties` linking users to domain-specific categories

## Extended Data Access

Access to tenant-specific user data follows the canonical query patterns defined in [../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md). Here's an implementation example:

```typescript
// Get user profile with tenant-specific extensions
const getTenantUserProfile = async (userId: string, tenantId: string) => {
  // Follow the withTenantContext pattern from DATABASE_QUERY_PATTERNS.md
  return withTenantContext(tenantId, async (client) => {
    // Verify user belongs to tenant
    const { data: userTenant, error: userTenantError } = await client
      .from('user_tenants')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (userTenantError || !userTenant) {
      throw new Error('User does not belong to tenant');
    }
    
    // Get tenant-specific profile
    const { data: tenantProfile, error: profileError } = await client
      .from('tenant_user_profiles')
      .select('*')
      .eq('user_tenant_id', userTenant.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // Not found is acceptable
      throw profileError;
    }
    
    // Get core profile
    const { data: coreProfile, error: coreError } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (coreError) throw coreError;
    
    // Combine profiles
    return {
      ...coreProfile,
      tenant_profile: tenantProfile || null
    };
  });
};
```

## Cross-Tenant User Management

### 1. Creating Users with Multi-Tenant Access

```typescript
/**
 * Creates a user with access to multiple tenants
 */
const createMultiTenantUser = async (
  userData: {
    email: string;
    fullName: string;
    password: string;
  },
  tenantIds: string[],
  defaultTenantId?: string
): Promise<{ user: User; tenantAccess: TenantAccess[] }> => {
  // First create the user in the authentication system
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: { full_name: userData.fullName }
  });
  
  if (authError) throw authError;
  const userId = authData.user.id;
  
  // Create initial profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: userData.fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  
  if (profileError) throw profileError;
  
  // Add user to tenants
  const tenantAccess: TenantAccess[] = [];
  for (const tenantId of tenantIds) {
    // Create user-tenant association
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        is_active: true,
      })
      .select('id')
      .single();
    
    if (userTenantError) throw userTenantError;
    
    // Initialize tenant-specific profile
    const { data: tenantProfile, error: tenantProfileError } = await supabase
      .from('tenant_user_profiles')
      .insert({
        user_tenant_id: userTenant.id,
        custom_fields: {}
      })
      .select('id')
      .single();
    
    if (tenantProfileError) throw tenantProfileError;
    
    // Assign default role for this tenant
    const { error: roleError } = await supabase
      .from('user_tenant_roles')
      .insert({
        user_tenant_id: userTenant.id,
        role_id: await getDefaultRoleForTenant(tenantId)
      });
    
    if (roleError) throw roleError;
    
    tenantAccess.push({
      tenantId,
      userTenantId: userTenant.id,
      isDefault: defaultTenantId === tenantId
    });
  }
  
  // Set default tenant if specified
  if (defaultTenantId) {
    const { error: defaultError } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        default_tenant_id: defaultTenantId
      });
    
    if (defaultError) throw defaultError;
  }
  
  // Return created user with tenant access
  return {
    user: {
      id: userId,
      email: userData.email,
      fullName: userData.fullName,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    tenantAccess
  };
};
```

### 2. Managing User Access to Tenants

```typescript
/**
 * Grant a user access to a new tenant
 */
const grantUserTenantAccess = async (
  userId: string,
  tenantId: string,
  roleId: string,
  grantedBy: string
): Promise<void> => {
  return withTenantContext(tenantId, async (client) => {
    // Check if granter has permission to manage users in this tenant
    const hasPermission = await client.rpc('user_has_permission', { 
      user_id: grantedBy,
      action_name: 'ManageUsers',
      resource_name: 'users'
    });
    
    if (!hasPermission) {
      throw new Error('Permission denied to manage users in this tenant');
    }
    
    // Check if user already has access to this tenant
    const { data: existingAccess } = await client
      .from('user_tenants')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    
    if (existingAccess) {
      throw new Error('User already has access to this tenant');
    }
    
    // Create the user-tenant relationship
    const { data: userTenant, error: userTenantError } = await client
      .from('user_tenants')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        is_active: true
      })
      .select('id')
      .single();
    
    if (userTenantError) throw userTenantError;
    
    // Initialize tenant-specific profile
    const { error: profileError } = await client
      .from('tenant_user_profiles')
      .insert({
        user_tenant_id: userTenant.id,
        custom_fields: {}
      });
    
    if (profileError) throw profileError;
    
    // Assign role
    const { error: roleError } = await client
      .from('user_tenant_roles')
      .insert({
        user_tenant_id: userTenant.id,
        role_id: roleId,
        created_by: grantedBy
      });
    
    if (roleError) throw roleError;
    
    // Log the grant action
    await client.rpc('log_audit_event', {
      event_type: 'USER_TENANT_ACCESS_GRANTED',
      user_id: grantedBy,
      resource_id: userId,
      resource_type: 'user',
      tenant_id: tenantId,
      metadata: { role_id: roleId }
    });
  });
};

/**
 * Revoke a user's access to a tenant
 */
const revokeUserTenantAccess = async (
  userId: string,
  tenantId: string,
  revokedBy: string
): Promise<void> => {
  return withTenantContext(tenantId, async (client) => {
    // Check if revoker has permission
    const hasPermission = await client.rpc('user_has_permission', { 
      user_id: revokedBy,
      action_name: 'ManageUsers',
      resource_name: 'users'
    });
    
    if (!hasPermission) {
      throw new Error('Permission denied to manage users in this tenant');
    }
    
    // Find the user-tenant relationship
    const { data: userTenant, error: findError } = await client
      .from('user_tenants')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (findError || !userTenant) {
      throw new Error('User does not have access to this tenant');
    }
    
    // Remove tenant-specific profile
    const { error: profileError } = await client
      .from('tenant_user_profiles')
      .delete()
      .eq('user_tenant_id', userTenant.id);
    
    if (profileError) throw profileError;
    
    // Remove role assignments
    const { error: roleError } = await client
      .from('user_tenant_roles')
      .delete()
      .eq('user_tenant_id', userTenant.id);
    
    if (roleError) throw roleError;
    
    // Remove user-tenant relationship
    const { error: deleteError } = await client
      .from('user_tenants')
      .delete()
      .eq('id', userTenant.id);
    
    if (deleteError) throw deleteError;
    
    // Log the revoke action
    await client.rpc('log_audit_event', {
      event_type: 'USER_TENANT_ACCESS_REVOKED',
      user_id: revokedBy,
      resource_id: userId,
      resource_type: 'user',
      tenant_id: tenantId
    });
  });
};
```

### 3. Updating User Profiles Across Tenants

```typescript
/**
 * Update a user's core profile (affects all tenants)
 */
const updateUserCoreProfile = async (
  userId: string,
  updates: {
    fullName?: string;
    avatarUrl?: string;
  },
  updatedBy: string
): Promise<void> => {
  // Check if updater is the user or has admin permissions
  if (userId !== updatedBy) {
    const { data: hasPermission } = await supabase.rpc('user_has_global_permission', {
      user_id: updatedBy,
      action_name: 'UpdateUsers',
      resource_name: 'users'
    });
    
    if (!hasPermission) {
      throw new Error('Permission denied to update other users');
    }
  }
  
  // Update profile fields
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };
  
  if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
  if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
  
  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);
  
  if (error) throw error;
  
  // Log the update
  await supabase.rpc('log_audit_event', {
    event_type: 'USER_PROFILE_UPDATED',
    user_id: updatedBy,
    resource_id: userId,
    resource_type: 'user',
    metadata: { updated_fields: Object.keys(updates) }
  });
};

/**
 * Update a user's tenant-specific profile
 */
const updateUserTenantProfile = async (
  userId: string,
  tenantId: string,
  updates: Record<string, any>,
  updatedBy: string
): Promise<void> => {
  return withTenantContext(tenantId, async (client) => {
    // Verify user belongs to tenant and get user_tenant_id
    const { data: userTenant, error: userTenantError } = await client
      .from('user_tenants')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (userTenantError || !userTenant) {
      throw new Error('User does not belong to tenant');
    }
    
    // Check permissions
    if (userId !== updatedBy) {
      const hasPermission = await client.rpc('user_has_permission', {
        user_id: updatedBy,
        action_name: 'UpdateUsers',
        resource_name: 'users'
      });
      
      if (!hasPermission) {
        throw new Error('Permission denied to update user in this tenant');
      }
    }
    
    // Get existing profile
    const { data: existing, error: fetchError } = await client
      .from('tenant_user_profiles')
      .select('custom_fields')
      .eq('user_tenant_id', userTenant.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    
    // Merge custom fields
    const customFields = {
      ...(existing?.custom_fields || {}),
      ...updates
    };
    
    // Update or insert profile
    if (existing) {
      const { error: updateError } = await client
        .from('tenant_user_profiles')
        .update({
          custom_fields: customFields,
          updated_at: new Date().toISOString()
        })
        .eq('user_tenant_id', userTenant.id);
      
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client
        .from('tenant_user_profiles')
        .insert({
          user_tenant_id: userTenant.id,
          custom_fields: customFields
        });
      
      if (insertError) throw insertError;
    }
    
    // Log the update
    await client.rpc('log_audit_event', {
      event_type: 'USER_TENANT_PROFILE_UPDATED',
      user_id: updatedBy,
      resource_id: userId,
      resource_type: 'user',
      tenant_id: tenantId,
      metadata: { updated_fields: Object.keys(updates) }
    });
  });
};
```

### 4. Cross-Tenant User Search

```typescript
/**
 * Search for users across multiple tenants
 * @param currentUserId The ID of the user performing the search
 * @param searchTerm The search term to match against user profiles
 * @param tenantIds Optional array of tenant IDs to search within
 * @returns Array of users matching the search criteria
 */
const searchUsersAcrossTenants = async (
  currentUserId: string,
  searchTerm: string,
  tenantIds?: string[]
): Promise<UserSearchResult[]> => {
  // Get tenants the current user has access to
  const { data: accessibleTenants, error: tenantError } = await supabase
    .from('user_tenants')
    .select('tenant_id, tenants(name)')
    .eq('user_id', currentUserId)
    .eq('is_active', true);
  
  if (tenantError) throw tenantError;
  
  // Filter to requested tenants if specified
  let tenantsToSearch = accessibleTenants;
  if (tenantIds && tenantIds.length > 0) {
    tenantsToSearch = accessibleTenants.filter(t => 
      tenantIds.includes(t.tenant_id)
    );
  }
  
  if (tenantsToSearch.length === 0) {
    return [];
  }
  
  // Search for users in each tenant
  const searchResults: UserSearchResult[] = [];
  
  for (const tenant of tenantsToSearch) {
    // Use the tenant context pattern from DATABASE_QUERY_PATTERNS.md
    const tenantUsers = await withTenantContext(tenant.tenant_id, async (client) => {
      // Verify the current user has permission to search users in this tenant
      const hasPermission = await client.rpc('user_has_permission', {
        user_id: currentUserId,
        action_name: 'ViewUsers',
        resource_name: 'users'
      });
      
      if (!hasPermission) {
        return [];
      }
      
      // Search users in this tenant
      const { data, error } = await client.rpc('search_users_in_tenant', {
        search_term: searchTerm,
        tenant_id: tenant.tenant_id
      });
      
      if (error) throw error;
      
      return data.map((user: any) => ({
        ...user,
        tenantId: tenant.tenant_id,
        tenantName: tenant.tenants.name
      }));
    }).catch(error => {
      console.error(`Error searching users in tenant ${tenant.tenant_id}:`, error);
      return [];
    });
    
    searchResults.push(...tenantUsers);
  }
  
  return searchResults;
};

/**
 * Example RPC function: search_users_in_tenant
 * CREATE OR REPLACE FUNCTION public.search_users_in_tenant(
 *   search_term TEXT,
 *   tenant_id UUID
 * ) RETURNS SETOF jsonb
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * BEGIN
 *   RETURN QUERY
 *   WITH tenant_users AS (
 *     SELECT ut.user_id, ut.id AS user_tenant_id
 *     FROM user_tenants ut
 *     WHERE ut.tenant_id = search_users_in_tenant.tenant_id
 *     AND ut.is_active = true
 *   )
 *   SELECT jsonb_build_object(
 *     'id', p.id,
 *     'fullName', p.full_name,
 *     'avatarUrl', p.avatar_url,
 *     'userTenantId', tu.user_tenant_id
 *   )
 *   FROM tenant_users tu
 *   JOIN profiles p ON p.id = tu.user_id
 *   WHERE p.full_name ILIKE '%' || search_term || '%'
 *   OR p.id::text = search_term;
 * END;
 * $$;
 */
```

## Tenant-Specific Validation

Tenant-specific data is validated through:

1. **Schema Registry**:
   - Tenant-defined validation schemas
   - Field-specific validation rules
   - Custom validation functions

2. **Validation Process**:
   ```typescript
   // Validate tenant-specific user data
   const validateTenantUserData = async (
     tenantId: string,
     userData: Record<string, any>
   ) => {
     // Get tenant schema
     const { data: tenantSchema } = await supabase
       .from('tenant_schemas')
       .select('user_schema')
       .eq('tenant_id', tenantId)
       .single();
     
     // Parse schema into Zod validator
     const schema = parseSchemaToZod(tenantSchema.user_schema);
     
     // Validate data against schema
     return schema.safeParse(userData);
   };
   ```

### User Invitation Workflow Across Tenants

```typescript
/**
 * Invite a user to multiple tenants
 */
const inviteUserToTenants = async (
  email: string,
  tenantIds: string[],
  roleIds: Record<string, string>, // Map of tenant IDs to role IDs
  invitedBy: string,
  defaultTenantId?: string
): Promise<void> => {
  // Generate a unique invitation token
  const invitationToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Create invitation record
  const { data: invitation, error: inviteError } = await supabase
    .from('user_invitations')
    .insert({
      email,
      token: invitationToken,
      expires_at: expiresAt.toISOString(),
      invited_by: invitedBy,
      tenant_data: tenantIds.map(tenantId => ({
        tenant_id: tenantId,
        role_id: roleIds[tenantId]
      })),
      default_tenant_id: defaultTenantId || tenantIds[0]
    })
    .select('id')
    .single();
  
  if (inviteError) throw inviteError;
  
  // Log invitation for each tenant
  for (const tenantId of tenantIds) {
    await withTenantContext(tenantId, async (client) => {
      await client.rpc('log_audit_event', {
        event_type: 'USER_INVITED',
        user_id: invitedBy,
        resource_type: 'invitation',
        resource_id: invitation.id,
        tenant_id: tenantId,
        metadata: { 
          email,
          role_id: roleIds[tenantId]
        }
      });
    });
  }
  
  // Send invitation email
  const inviteUrl = `https://app.example.com/accept-invite?token=${invitationToken}`;
  
  await supabase.functions.invoke('send-invitation-email', {
    body: {
      email,
      inviteUrl,
      tenantIds,
      invitedBy
    }
  });
};

/**
 * Accept a user invitation
 */
const acceptUserInvitation = async (
  token: string,
  userData: {
    fullName: string;
    password: string;
  }
): Promise<{
  user: User;
  tenants: {
    id: string;
    name: string;
    isDefault: boolean;
  }[];
}> => {
  // Validate the invitation token
  const { data: invitation, error: inviteError } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('token', token)
    .single();
  
  if (inviteError || !invitation) {
    throw new Error('Invalid or expired invitation');
  }
  
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation has expired');
  }
  
  if (invitation.accepted_at) {
    throw new Error('Invitation has already been accepted');
  }
  
  // Create the user account
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: invitation.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: { full_name: userData.fullName }
  });
  
  if (authError) throw authError;
  const userId = authData.user.id;
  
  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: userData.fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  
  if (profileError) throw profileError;
  
  // Add user to all invited tenants
  const tenantResults = [];
  
  for (const tenantData of invitation.tenant_data) {
    const { tenant_id, role_id } = tenantData;
    
    // Get tenant details
    const { data: tenantDetails } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();
    
    // Create user-tenant relationship
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: userId,
        tenant_id,
        is_active: true
      })
      .select('id')
      .single();
    
    if (userTenantError) throw userTenantError;
    
    // Create tenant-specific profile
    await supabase
      .from('tenant_user_profiles')
      .insert({
        user_tenant_id: userTenant.id,
        custom_fields: {}
      });
    
    // Assign role
    await supabase
      .from('user_tenant_roles')
      .insert({
        user_tenant_id: userTenant.id,
        role_id,
        created_by: invitation.invited_by
      });
    
    tenantResults.push({
      id: tenant_id,
      name: tenantDetails?.name || 'Unknown Tenant',
      isDefault: tenant_id === invitation.default_tenant_id
    });
    
    // Log acceptance in tenant audit log
    await withTenantContext(tenant_id, async (client) => {
      await client.rpc('log_audit_event', {
        event_type: 'USER_INVITATION_ACCEPTED',
        user_id: userId,
        resource_type: 'invitation',
        resource_id: invitation.id,
        tenant_id: tenant_id
      });
    });
  }
  
  // Mark invitation as accepted
  await supabase
    .from('user_invitations')
    .update({
      accepted_at: new Date().toISOString(),
      user_id: userId
    })
    .eq('id', invitation.id);
  
  // Set default tenant preference
  if (invitation.default_tenant_id) {
    await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        default_tenant_id: invitation.default_tenant_id
      });
  }
  
  return {
    user: {
      id: userId,
      email: invitation.email,
      fullName: userData.fullName
    },
    tenants: tenantResults
  };
};
```

For more complete implementation details, refer to:
- [DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md) for canonical multi-tenant query patterns
- [DATA_ISOLATION.md](../multitenancy/DATA_ISOLATION.md) for data isolation architecture

## Related Documentation

- **[CORE_USER_MODEL.md](CORE_USER_MODEL.md)**: Core user model definition
- **[README.md](README.md)**: User management system overview
- **[../multitenancy/README.md](../multitenancy/README.md)**: Multitenancy architecture
- **[../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md)**: Canonical multi-tenant query patterns
- **[../rbac/PERMISSION_RESOLUTION.md](../rbac/PERMISSION_RESOLUTION.md)**: Permission resolution process
- **[../security/AUTH_SYSTEM.md](../security/AUTH_SYSTEM.md)**: Authentication system

## Version History

- **1.2.0**: Added comprehensive code examples for user management across tenants (2025-05-22)
- **1.1.0**: Updated to reference canonical DATABASE_QUERY_PATTERNS.md (2025-05-22)
- **1.0.0**: Initial user extension mechanisms document
