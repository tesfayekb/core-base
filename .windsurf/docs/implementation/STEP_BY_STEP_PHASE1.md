
# Phase 1: Foundation - Step-by-Step Implementation Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Detailed step-by-step implementation guide for Phase 1 Foundation with troubleshooting for common issues.

## Prerequisites Checklist

Before starting Phase 1 implementation:

- [ ] Node.js 18+ installed
- [ ] Supabase CLI installed and configured
- [ ] Git repository initialized
- [ ] Environment variables configured
- [ ] Database connection verified

## Week 1: Database & Authentication Setup

### Step 1.1: Database Schema Implementation

**Estimated Time**: 4-6 hours

#### Implementation Steps:

1. **Create Core Tables**
```sql
-- Step 1: Create tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Create users table extension
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Step 3: Create roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);
```

2. **Enable Row Level Security**
```sql
-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "tenant_isolation" ON tenants
  FOR ALL USING (id = get_current_tenant_id());

CREATE POLICY "role_tenant_isolation" ON roles
  FOR ALL USING (tenant_id = get_current_tenant_id());
```

3. **Create Database Functions**
```sql
-- Tenant context function
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.tenant_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Set tenant context function
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_id::TEXT, true);
END;
$$ LANGUAGE plpgsql;
```

#### Validation Steps:

1. **Verify Table Creation**
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'roles');
```

2. **Test RLS Policies**
```sql
-- Test tenant isolation
SELECT set_tenant_context('00000000-0000-0000-0000-000000000000');
SELECT * FROM tenants; -- Should return empty or filtered results
```

3. **Validate Functions**
```sql
-- Test tenant context functions
SELECT set_tenant_context('test-tenant-id');
SELECT get_current_tenant_id();
```

#### Common Issues & Troubleshooting:

**Issue**: `relation "tenants" does not exist`
```bash
# Solution: Reset and apply migrations
supabase db reset
supabase db push
```

**Issue**: RLS policies blocking legitimate access
```sql
-- Debug: Check current tenant context
SELECT current_setting('app.tenant_id', true);

-- Fix: Ensure tenant context is set before queries
SELECT set_tenant_context('your-tenant-id');
```

**Issue**: UUID generation not working
```sql
-- Verify uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Step 1.2: Authentication System Implementation

**Estimated Time**: 6-8 hours

#### Implementation Steps:

1. **Create Authentication Service**
```typescript
// src/services/authService.ts
import { supabase } from '../lib/supabase';

export class AuthService {
  async signUp(email: string, password: string, tenantId?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            tenant_id: tenantId
          }
        }
      });
      
      if (error) throw error;
      
      // Set tenant context after signup
      if (tenantId) {
        await this.setTenantContext(tenantId);
      }
      
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Signup failed:', error);
      return { user: null, error };
    }
  }
  
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Set tenant context from user metadata
      const tenantId = data.user?.user_metadata?.tenant_id;
      if (tenantId) {
        await this.setTenantContext(tenantId);
      }
      
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Signin failed:', error);
      return { user: null, error };
    }
  }
  
  private async setTenantContext(tenantId: string) {
    try {
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
    } catch (error) {
      console.error('Failed to set tenant context:', error);
    }
  }
}
```

2. **Create Authentication Context**
```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, tenantId?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authService = new AuthService();
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const signUp = async (email: string, password: string, tenantId?: string) => {
    return await authService.signUp(email, password, tenantId);
  };
  
  const signIn = async (email: string, password: string) => {
    return await authService.signIn(email, password);
  };
  
  const signOut = async () => {
    await supabase.auth.signOut();
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### Validation Steps:

1. **Test User Registration**
```typescript
// Test signup flow
const result = await authService.signUp('test@example.com', 'password123');
console.log('Signup result:', result);
```

2. **Test Authentication Flow**
```typescript
// Test signin flow
const result = await authService.signIn('test@example.com', 'password123');
console.log('Signin result:', result);
```

3. **Verify Tenant Context**
```sql
-- Check tenant context is set after auth
SELECT current_setting('app.tenant_id', true);
```

#### Common Issues & Troubleshooting:

**Issue**: "User already registered" error
```typescript
// Solution: Check if user exists first
const { data } = await supabase
  .from('auth.users')
  .select('id')
  .eq('email', email)
  .single();

if (data) {
  return { error: 'User already exists' };
}
```

**Issue**: Tenant context not persisting
```typescript
// Solution: Set tenant context in auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    const tenantId = session.user.user_metadata?.tenant_id;
    if (tenantId) {
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
    }
  }
});
```

**Issue**: Authentication state not updating in UI
```typescript
// Solution: Ensure AuthProvider wraps entire app
// App.tsx
<AuthProvider>
  <Router>
    <Routes>
      {/* Your routes */}
    </Routes>
  </Router>
</AuthProvider>
```

## Week 2: RBAC Foundation

### Step 2.1: Role Architecture Implementation

**Estimated Time**: 8-10 hours

#### Implementation Steps:

1. **Create Permission Types**
```typescript
// src/types/permissions.ts
export interface Permission {
  id: string;
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  permissions: string[];
  created_at: string;
}

export const PERMISSION_ACTIONS = [
  'Create',
  'Read', 
  'Update',
  'Delete',
  'ViewAny',
  'UpdateAny',
  'DeleteAny'
] as const;

export const RESOURCES = [
  'users',
  'roles',
  'permissions',
  'tenants',
  'audit_logs'
] as const;
```

2. **Implement Permission Service**
```typescript
// src/services/permissionService.ts
import { supabase } from '../lib/supabase';
import { Permission } from '../types/permissions';

export class PermissionService {
  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        user_id: userId,
        action_name: action,
        resource_name: resource,
        resource_id: resourceId
      });
      
      if (error) {
        console.error('Permission check error:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }
  
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        user_id: userId
      });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }
}
```

3. **Create Database Functions for RBAC**
```sql
-- Check user permission function
CREATE OR REPLACE FUNCTION check_user_permission(
  user_id UUID,
  action_name TEXT,
  resource_name TEXT,
  resource_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
  user_tenant_id UUID;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO user_tenant_id 
  FROM auth.users 
  WHERE id = user_id;
  
  -- Set tenant context
  PERFORM set_tenant_context(user_tenant_id);
  
  -- Check if user has permission through roles
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_permission.user_id
    AND (action_name || ':' || resource_name) = ANY(r.permissions)
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql;
```

#### Validation Steps:

1. **Test Permission Assignment**
```sql
-- Create test role with permissions
INSERT INTO roles (tenant_id, name, permissions) 
VALUES (
  'test-tenant-id',
  'TestRole',
  ARRAY['Read:users', 'Update:users']
);
```

2. **Test Permission Checks**
```typescript
const hasPermission = await permissionService.checkPermission(
  'user-id',
  'Read',
  'users'
);
console.log('User has permission:', hasPermission);
```

#### Common Issues & Troubleshooting:

**Issue**: Permission function returns null instead of boolean
```sql
-- Solution: Ensure function handles edge cases
CREATE OR REPLACE FUNCTION check_user_permission(...)
RETURNS BOOLEAN AS $$
BEGIN
  -- Always return a boolean, never null
  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql;
```

**Issue**: Permissions not updating after role changes
```typescript
// Solution: Clear permission cache after role updates
class PermissionService {
  private cache = new Map();
  
  clearCache(userId: string) {
    this.cache.delete(userId);
  }
  
  async updateUserRole(userId: string, roleId: string) {
    // Update role
    await this.assignRole(userId, roleId);
    // Clear cache
    this.clearCache(userId);
  }
}
```

## Phase 1 Success Criteria

### Quantifiable Validation Metrics

#### Database Performance
- [ ] Table creation time < 5 seconds
- [ ] RLS policy check time < 10ms per query
- [ ] Tenant context switch time < 1ms

#### Authentication Performance  
- [ ] User registration time < 2 seconds
- [ ] User login time < 1 second
- [ ] Session validation time < 100ms

#### RBAC Performance
- [ ] Permission check time < 50ms
- [ ] Role assignment time < 200ms
- [ ] Permission cache hit rate > 90%

#### Security Validation
- [ ] All database queries use RLS
- [ ] No cross-tenant data leakage
- [ ] All user inputs sanitized
- [ ] Authentication tokens properly validated

#### Integration Testing
- [ ] Auth + RBAC integration: 100% test pass rate
- [ ] Multi-tenant + RBAC integration: 100% test pass rate
- [ ] All error scenarios handled gracefully

## Next Steps

Upon successful completion of Phase 1:
1. Run complete validation test suite
2. Performance benchmark all metrics
3. Security audit of implementation
4. Document any deviations from plan
5. Proceed to Phase 2 implementation

## Related Documentation

- **[TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)**: Detailed troubleshooting for integration issues
- **[testing/PHASE1_TESTING.md](testing/PHASE1_TESTING.md)**: Phase 1 testing requirements
- **[VALIDATION_CHECKLISTS.md](VALIDATION_CHECKLISTS.md)**: Validation procedures

## Version History

- **1.0.0**: Initial Phase 1 step-by-step implementation guide (2025-05-23)
