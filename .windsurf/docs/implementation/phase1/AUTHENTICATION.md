
# Authentication System Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Step-by-step guide for implementing the authentication system with multi-tenant support.

## Implementation Steps

### Step 1: Create Authentication Service

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

### Step 2: Create Authentication Context

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
  
  // ...implementation of signUp, signIn, signOut methods
}
```

## Validation Steps

### Test User Registration

```typescript
// Test signup flow
const result = await authService.signUp('test@example.com', 'password123');
console.log('Signup result:', result);
```

### Test Authentication Flow

```typescript
// Test signin flow
const result = await authService.signIn('test@example.com', 'password123');
console.log('Signin result:', result);
```

### Verify Tenant Context

```sql
-- Check tenant context is set after auth
SELECT current_setting('app.tenant_id', true);
```

## Common Issues & Solutions

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

## Next Steps

- Proceed to [RBAC_SETUP.md](RBAC_SETUP.md) for RBAC implementation
- Review [../testing/AUTH_TESTING.md](../testing/AUTH_TESTING.md) for authentication testing

## Version History

- **1.0.0**: Initial authentication implementation guide (2025-05-23)
