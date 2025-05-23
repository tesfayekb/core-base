
# Multi-Tenant Foundation Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Step-by-step guide for implementing the multi-tenant foundation with data isolation and tenant context management.

## Implementation Steps

### Step 1: Tenant Context Service

```typescript
// src/services/tenantContext.ts
import { supabase } from '../lib/supabase';

export class TenantContextService {
  // Get current tenant ID from session or storage
  async getCurrentTenantId(): Promise<string | null> {
    try {
      // First check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      // Get tenant ID from user metadata
      const tenantId = session.user.user_metadata?.tenant_id;
      if (tenantId) return tenantId;
      
      // If no tenant in metadata, check local storage
      const storedTenantId = localStorage.getItem('current_tenant_id');
      return storedTenantId;
    } catch (error) {
      console.error('Failed to get current tenant ID:', error);
      return null;
    }
  }
  
  // Set current tenant context
  async setCurrentTenant(tenantId: string): Promise<boolean> {
    try {
      // Store in local storage for persistence
      localStorage.setItem('current_tenant_id', tenantId);
      
      // Set tenant context in database session
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
      
      // Dispatch event for components to react
      window.dispatchEvent(new CustomEvent('tenantChanged', { detail: tenantId }));
      
      return true;
    } catch (error) {
      console.error('Failed to set tenant context:', error);
      return false;
    }
  }
  
  // Clear tenant context
  async clearTenantContext(): Promise<void> {
    localStorage.removeItem('current_tenant_id');
    window.dispatchEvent(new CustomEvent('tenantChanged', { detail: null }));
  }
}
```

### Step 2: Tenant-Aware Data Service

```typescript
// src/services/tenantDataService.ts
import { supabase } from '../lib/supabase';
import { TenantContextService } from './tenantContext';

const tenantContext = new TenantContextService();

export class TenantDataService {
  // Generic tenant-aware query function
  async query<T>(
    tableName: string, 
    select: string = '*',
    filters: Record<string, any> = {}
  ): Promise<T[]> {
    try {
      // Ensure tenant context is set
      const tenantId = await tenantContext.getCurrentTenantId();
      if (!tenantId) {
        throw new Error('No tenant context available');
      }
      
      // Execute query with tenant isolation
      const { data, error } = await supabase
        .from(tableName)
        .select(select)
        .eq('tenant_id', tenantId)
        .match(filters);
        
      if (error) throw error;
      
      return data as T[];
    } catch (error) {
      console.error(`Failed to query ${tableName}:`, error);
      throw error;
    }
  }
  
  // Insert with tenant context
  async insert<T>(
    tableName: string,
    data: Omit<T, 'tenant_id'>
  ): Promise<T> {
    try {
      const tenantId = await tenantContext.getCurrentTenantId();
      if (!tenantId) {
        throw new Error('No tenant context available');
      }
      
      const { data: result, error } = await supabase
        .from(tableName)
        .insert({ ...data, tenant_id: tenantId })
        .select()
        .single();
        
      if (error) throw error;
      
      return result as T;
    } catch (error) {
      console.error(`Failed to insert into ${tableName}:`, error);
      throw error;
    }
  }
  
  // Additional CRUD operations with tenant awareness
}
```

### Step 3: Tenant Context Hook

```typescript
// src/hooks/useTenantContext.ts
import { useEffect, useState } from 'react';
import { TenantContextService } from '../services/tenantContext';

const tenantService = new TenantContextService();

export function useTenantContext() {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load initial tenant context
    const loadTenantContext = async () => {
      const tenantId = await tenantService.getCurrentTenantId();
      setCurrentTenantId(tenantId);
      setLoading(false);
    };
    
    loadTenantContext();
    
    // Listen for tenant context changes
    const handleTenantChange = (event: CustomEvent<string | null>) => {
      setCurrentTenantId(event.detail);
    };
    
    window.addEventListener('tenantChanged', handleTenantChange as EventListener);
    return () => {
      window.removeEventListener('tenantChanged', handleTenantChange as EventListener);
    };
  }, []);
  
  const setTenant = async (tenantId: string) => {
    const success = await tenantService.setCurrentTenant(tenantId);
    if (success) {
      setCurrentTenantId(tenantId);
    }
    return success;
  };
  
  const clearTenant = async () => {
    await tenantService.clearTenantContext();
    setCurrentTenantId(null);
  };
  
  return {
    currentTenantId,
    setTenant,
    clearTenant,
    loading
  };
}
```

## Validation Steps

### Test Tenant Context

```typescript
// Test tenant context management
const tenantService = new TenantContextService();
await tenantService.setCurrentTenant('test-tenant-id');
const currentTenant = await tenantService.getCurrentTenantId();
console.log('Current tenant:', currentTenant);
```

### Test Tenant Data Isolation

```typescript
// Test data isolation
const dataService = new TenantDataService();
const users = await dataService.query('users');
console.log('Tenant users:', users);
```

## Common Issues & Solutions

**Issue**: Tenant context lost after page refresh
```typescript
// Solution: Use both localStorage and database session
const setCurrentTenant = async (tenantId: string) => {
  // Store in localStorage
  localStorage.setItem('current_tenant_id', tenantId);
  
  // Store in user metadata if authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.auth.updateUser({
      data: { tenant_id: tenantId }
    });
  }
  
  // Set database session
  await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
};
```

**Issue**: Data leakage between tenants
```sql
-- Solution: Add additional RLS policy check for tenant_id is not null
CREATE POLICY "enforce_tenant_id_not_null" ON users
  FOR ALL
  USING (tenant_id IS NOT NULL AND tenant_id = get_current_tenant_id());
```

## Next Steps

- Complete Phase 1 implementation
- Run [../testing/MULTI_TENANT_TESTING.md](../testing/MULTI_TENANT_TESTING.md) validation tests
- Proceed to Phase 2 implementation [../../phase2/README.md](../../phase2/README.md)

## Version History

- **1.0.0**: Initial multi-tenant foundation guide (2025-05-23)
