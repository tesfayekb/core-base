
# Core User Model

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines the core user model employed across the system, establishing the foundation for user identity, authentication, and profile management. The core user model is designed to support multi-tenant applications while maintaining consistency and security.

## User Entity Architecture

### Core Identity Structure

The user entity is structured in layers:

1. **Authentication Layer**:
   - Supabase Auth managed identity
   - Contains authentication credentials and security data
   - Globally unique across the system

2. **Core Profile Layer**:
   - Universal attributes shared across all applications
   - Consistent regardless of tenant context
   - Foundation for all user interactions

3. **Extension Layer**:
   - Tenant-specific attributes
   - Application-specific extensions
   - Custom fields and metadata

### Separation of Concerns

Each layer has distinct responsibilities:

1. **Authentication Layer**: 
   - **Responsibility**: User identity verification and security
   - **Owner**: Authentication system (Supabase Auth)
   - **Access Pattern**: Limited direct access, primarily through auth system

2. **Core Profile Layer**:
   - **Responsibility**: Universal user identification and fundamental attributes
   - **Owner**: User management system
   - **Access Pattern**: Read access common, updates restricted by permission

3. **Extension Layer**:
   - **Responsibility**: Domain-specific user attributes
   - **Owner**: Individual tenant/application contexts
   - **Access Pattern**: Isolated by tenant, managed within tenant context

## Core User Properties

### Universal Attributes

These properties are maintained for all users across all applications:

#### Identity Attributes
| Attribute | Type | Description | Constraints |
|-----------|------|-------------|------------|
| id | UUID | Primary identifier | Immutable, system-generated |
| email | String | Primary contact/login | Unique, validated format |
| full_name | String | Display name | Required |
| avatar_url | String | Profile image URL | Optional |

#### Account Status Attributes
| Attribute | Type | Description | Constraints |
|-----------|------|-------------|------------|
| is_active | Boolean | Account active state | Default: true |
| last_sign_in_at | Timestamp | Last authentication | System-managed |
| created_at | Timestamp | Account creation | Immutable |
| updated_at | Timestamp | Last update | System-managed |

#### Security Attributes
| Attribute | Type | Description | Constraints |
|-----------|------|-------------|------------|
| two_factor_enabled | Boolean | MFA status | Default: false |
| password_last_changed | Timestamp | Password age tracking | System-managed |
| session_timeout_minutes | Integer | Session validity period | Default: 60 |

### Implementation Model

The core user data spans multiple tables:

```
// Managed by authentication system
auth.users(
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  encrypted_password TEXT,
  confirmed_at TIMESTAMP,
  recovery_token TEXT,
  recovery_sent_at TIMESTAMP,
  // Additional auth system fields
)

// Core profile - consistent across all tenants
profiles(
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_sign_in_at TIMESTAMP WITH TIME ZONE
)

// Security settings
user_security_settings(
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  two_factor_enabled BOOLEAN DEFAULT false,
  password_last_changed TIMESTAMP WITH TIME ZONE,
  session_timeout_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)
```

## Tenant-Specific Extensions

For tenant-specific user data and extension mechanisms, please refer to the following documents:

- **[../multitenancy/README.md](../multitenancy/README.md)**: Comprehensive multitenancy architecture
- **[USER_EXTENSIONS.md](USER_EXTENSIONS.md)**: Detailed information on user extension mechanisms

These documents provide the definitive reference for extending the core user model within tenant contexts.

## Data Access Patterns

### Core Data Access

Access to core user data follows these patterns:

1. **Profile Retrieval**:
   ```typescript
   // Get user profile by ID
   const getUserProfile = async (userId: string) => {
     const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .eq('id', userId)
       .single();
     
     if (error) throw error;
     return data;
   };
   ```

2. **Profile Update**:
   ```typescript
   // Update user profile
   const updateUserProfile = async (userId: string, updates: Partial<Profile>) => {
     // Permission check - can only update own profile unless admin
     if (!checkPermission(currentUser, 'Update', 'profile') && currentUser.id !== userId) {
       throw new Error('Permission denied');
     }
     
     const { data, error } = await supabase
       .from('profiles')
       .update(updates)
       .eq('id', userId)
       .single();
     
     if (error) throw error;
     return data;
   };
   ```

## Integration with RBAC

### User-Role Relationship

Users are assigned roles within tenant contexts:

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

### Permission Resolution

The permission resolution process considers:

1. **User Identity**: The authenticated user
2. **Tenant Context**: The current tenant scope
3. **Role Assignments**: Roles assigned to the user within the tenant
4. **Permission Aggregation**: Union of all permissions from assigned roles

See [../rbac/PERMISSION_RESOLUTION.md](../rbac/PERMISSION_RESOLUTION.md) for details.

## Row-Level Security Implementation

### Core Tables RLS

For core user tables, RLS policies enforce:

```sql
-- Profiles table RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profiles
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## Related Documentation

- **[README.md](README.md)**: User management system overview
- **[../rbac/PERMISSION_RESOLUTION.md](../rbac/PERMISSION_RESOLUTION.md)**: Permission resolution process
- **[../multitenancy/README.md](../multitenancy/README.md)**: Multitenancy architecture
- **[../security/AUTH_SYSTEM.md](../security/AUTH_SYSTEM.md)**: Authentication system

## Version History

- **1.1.0**: Refactored to reference multitenancy documents for tenant-specific extensions
- **1.0.0**: Initial core user model document

