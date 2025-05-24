
# Multi-Tenant Implementation Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

This document provides concrete implementation examples for the multi-tenant architecture, illustrating best practices and common patterns described in the architectural documentation.

## Database Query Layer Examples

### Tenant Context Setting

```typescript
/**
 * Sets tenant context for database operations
 * Implementation follows DATABASE_QUERY_PATTERNS.md
 */
export async function setTenantContext(
  tenantId: string,
  userId?: string
): Promise<void> {
  // Validate tenant access first
  if (userId) {
    const hasAccess = await verifyTenantAccess(userId, tenantId);
    if (!hasAccess) {
      throw new Error('User does not have access to this tenant');
    }
  }
  
  // Set tenant context in database session
  await supabase.rpc('set_tenant_context', {
    tenant_id: tenantId
  });
  
  // Also set tenant context in application state
  store.dispatch({
    type: 'SET_TENANT_CONTEXT',
    payload: { tenantId }
  });
  
  // Log tenant context change for audit
  await logTenantContextChange(tenantId, userId);
}
```

### Tenant-Aware Repository Pattern

```typescript
/**
 * Generic tenant-aware repository implementation
 */
export class TenantAwareRepository<T extends { id: string }> {
  constructor(
    private tableName: string,
    private tenantService: TenantContextService
  ) {}
  
  async findById(id: string): Promise<T | null> {
    const tenantId = this.tenantService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context established');
    }
    
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }
    
    return data as T;
  }
  
  async findAll(options?: { limit?: number; offset?: number }): Promise<T[]> {
    const tenantId = this.tenantService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context established');
    }
    
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId);
      
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data as T[];
  }
  
  async create(entity: Omit<T, 'id' | 'tenant_id'>): Promise<T> {
    const tenantId = this.tenantService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context established');
    }
    
    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        ...entity,
        tenant_id: tenantId
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return data as T;
  }
  
  async update(id: string, updates: Partial<Omit<T, 'id' | 'tenant_id'>>): Promise<T> {
    const tenantId = this.tenantService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context established');
    }
    
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
      
    if (error) throw error;
    
    return data as T;
  }
  
  async delete(id: string): Promise<boolean> {
    const tenantId = this.tenantService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context established');
    }
    
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
      
    if (error) throw error;
    
    return true;
  }
}
```

## Tenant Isolation in APIs

### RESTful API with Tenant Context

```typescript
// Example Express middleware for tenant context validation
export function requireTenantContext(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    res.status(400).json({
      error: 'Missing tenant context',
      code: 'MISSING_TENANT_CONTEXT'
    });
    return;
  }
  
  // Verify user access to tenant
  verifyTenantAccess(req.user.id, tenantId)
    .then((hasAccess) => {
      if (!hasAccess) {
        res.status(403).json({
          error: 'Access denied to tenant',
          code: 'TENANT_ACCESS_DENIED'
        });
        return;
      }
      
      // Set tenant context in request for downstream handlers
      req.tenantId = tenantId;
      next();
    })
    .catch((error) => {
      res.status(500).json({
        error: 'Error validating tenant access',
        code: 'TENANT_ACCESS_ERROR'
      });
    });
}

// Example tenant-aware controller
export class TenantResourceController {
  async getResources(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      
      // Set database tenant context
      await setTenantContext(tenantId, req.user.id);
      
      // Proceed with data access (RLS will automatically filter by tenant)
      const { data, error } = await supabase
        .from('resources')
        .select('*');
        
      if (error) throw error;
      
      res.json({ resources: data });
    } catch (error) {
      res.status(500).json({
        error: 'Error fetching resources',
        details: error.message
      });
    }
  }
}
```

## Client-Side Tenant Management

### Tenant Context Handling in UI Application

```typescript
// Tenant context provider for React applications
export const TenantContext = createContext<{
  tenantId: string | null;
  tenantName: string | null;
  availableTenants: Tenant[];
  setCurrentTenant: (tenantId: string) => Promise<void>;
  isLoadingTenants: boolean;
}>({
  tenantId: null,
  tenantName: null,
  availableTenants: [],
  setCurrentTenant: async () => {},
  isLoadingTenants: false
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState<boolean>(true);
  
  const { user } = useAuth();
  
  // Load available tenants
  useEffect(() => {
    const loadTenants = async () => {
      if (!user) {
        setAvailableTenants([]);
        setTenantId(null);
        setTenantName(null);
        return;
      }
      
      try {
        setIsLoadingTenants(true);
        
        // Get tenants user has access to
        const { data: userTenants, error } = await supabase
          .from('user_tenants')
          .select(`
            tenant_id,
            is_default,
            tenants (
              id,
              name,
              slug
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);
          
        if (error) throw error;
        
        const tenants = userTenants.map(ut => ({
          id: ut.tenant_id,
          name: ut.tenants.name,
          slug: ut.tenants.slug,
          isDefault: ut.is_default
        }));
        
        setAvailableTenants(tenants);
        
        // Set default tenant
        if (tenants.length > 0) {
          const defaultTenant = tenants.find(t => t.isDefault) || tenants[0];
          
          // Only set if no tenant already selected
          if (!tenantId) {
            await setCurrentTenant(defaultTenant.id);
          }
        }
      } catch (error) {
        console.error('Error loading tenants:', error);
      } finally {
        setIsLoadingTenants(false);
      }
    };
    
    loadTenants();
  }, [user]);
  
  // Function to change tenant context
  const setCurrentTenant = async (newTenantId: string) => {
    try {
      // Find tenant in available tenants
      const tenant = availableTenants.find(t => t.id === newTenantId);
      if (!tenant) {
        throw new Error('Tenant not found in available tenants');
      }
      
      // Set tenant context in database session
      await supabase.rpc('set_tenant_context', {
        tenant_id: newTenantId
      });
      
      // Set tenant in local state
      setTenantId(newTenantId);
      setTenantName(tenant.name);
      
      // Save last used tenant for this user
      localStorage.setItem(`lastTenant_${user?.id}`, newTenantId);
      
      // Log tenant switch for audit
      await supabase.rpc('log_tenant_switch', {
        to_tenant_id: newTenantId
      });
      
      // Invalidate any permission or data caches
      invalidatePermissionCache();
      queryClient.invalidateQueries();
      
      return true;
    } catch (error) {
      console.error('Error setting tenant context:', error);
      return false;
    }
  };
  
  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantName,
        availableTenants,
        setCurrentTenant,
        isLoadingTenants
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

// Hook for accessing tenant context
export const useTenant = () => useContext(TenantContext);
```

### Tenant Selection UI Component

```typescript
export const TenantSelector: React.FC = () => {
  const { tenantId, tenantName, availableTenants, setCurrentTenant, isLoadingTenants } = useTenant();
  
  if (isLoadingTenants) {
    return <div>Loading tenants...</div>;
  }
  
  if (availableTenants.length === 0) {
    return <div>No accessible tenants</div>;
  }
  
  return (
    <div className="tenant-selector">
      <Select
        value={tenantId || ''}
        onChange={(e) => setCurrentTenant(e.target.value)}
        disabled={isLoadingTenants}
      >
        {availableTenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </Select>
    </div>
  );
};
```

## Integration with RBAC System

### Tenant-Aware Permission Checks

```typescript
/**
 * Permission check that respects tenant context
 * Implementation follows patterns from RBAC_SYSTEM.md
 */
export async function checkPermission(
  action: string,
  resourceType: string,
  resourceId?: string
): Promise<boolean> {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    return false; // No tenant context, cannot check permissions
  }
  
  const userId = getCurrentUserId();
  if (!userId) {
    return false; // No user logged in
  }
  
  // Get cached permissions for this tenant
  const cacheKey = `permissions:${userId}:${tenantId}`;
  const cachedPermissions = permissionCache.get(cacheKey);
  
  if (cachedPermissions) {
    // Check permission in cache
    return cachedPermissions.some(
      p => p.action === action && p.resource === resourceType
    );
  }
  
  // No cache, check permissions from database
  try {
    // First set tenant context for database query
    await supabase.rpc('set_tenant_context', {
      tenant_id: tenantId
    });
    
    // Now query permissions
    const { data, error } = await supabase.rpc('check_user_permission', {
      user_id: userId,
      action_name: action,
      resource_name: resourceType,
      resource_id: resourceId
    });
    
    if (error) throw error;
    
    return data === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}
```

## Tenant Provisioning Examples

### Tenant Creation with Initial Setup

```typescript
/**
 * Creates a new tenant with initial configuration
 */
export async function createTenant(
  tenantData: {
    name: string;
    slug: string;
    settings?: Record<string, any>;
  },
  ownerUserId: string
): Promise<{ tenantId: string; success: boolean }> {
  try {
    // Start transaction
    const { data: transaction, error: txError } = await supabase.rpc('start_transaction');
    if (txError) throw txError;
    const txId = transaction.transaction_id;
    
    // 1. Create tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantData.name,
        slug: tenantData.slug,
        settings: tenantData.settings || {}
      })
      .select('id')
      .single();
      
    if (tenantError) throw tenantError;
    
    // 2. Create default roles for the tenant
    const { data: roles, error: rolesError } = await supabase.rpc(
      'create_default_tenant_roles',
      {
        tenant_id: tenant.id
      }
    );
    
    if (rolesError) throw rolesError;
    
    // 3. Assign tenant admin role to owner
    const { error: roleAssignError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: ownerUserId,
        tenant_id: tenant.id,
        role_id: roles.admin_role_id,
        is_default: true
      });
      
    if (roleAssignError) throw roleAssignError;
    
    // 4. Create initial tenant resources
    await supabase.rpc('provision_tenant_resources', {
      tenant_id: tenant.id,
      created_by: ownerUserId
    });
    
    // 5. Commit transaction
    await supabase.rpc('commit_transaction', {
      transaction_id: txId
    });
    
    // 6. Log tenant creation for audit
    await supabase.rpc('log_tenant_created', {
      tenant_id: tenant.id,
      created_by: ownerUserId
    });
    
    return { tenantId: tenant.id, success: true };
  } catch (error) {
    console.error('Error creating tenant:', error);
    return { tenantId: '', success: false };
  }
}
```

## Related Documentation

- **[DATA_ISOLATION.md](DATA_ISOLATION.md)**: Tenant data isolation strategies
- **[DATABASE_QUERY_PATTERNS.md](DATABASE_QUERY_PATTERNS.md)**: Multi-tenant query patterns
- **[SESSION_MANAGEMENT.md](SESSION_MANAGEMENT.md)**: Multi-tenant session management
- **[../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)**: Entity boundary implementation
- **[../security/MULTI_TENANT_ROLES.md](../security/MULTI_TENANT_ROLES.md)**: Multi-tenant role architecture

## Version History

- **1.0.0**: Initial multi-tenant implementation examples (2025-05-23)
