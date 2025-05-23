
# Core Implementation Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides the essential implementation examples for all major system components. These examples follow the patterns defined in the [AUTHORITATIVE_IMPLEMENTATION_PATH.md](AUTHORITATIVE_IMPLEMENTATION_PATH.md).

## Database Examples

### Tenant-Aware Repository Pattern

```typescript
/**
 * Standard tenant-aware repository implementation
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
    
    // Database query with tenant context
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
  
  // Additional repository methods follow the same pattern
  // with tenant context enforcement
}
```

## Authentication Examples

### Tenant-Aware Authentication

```typescript
/**
 * Login with tenant context
 */
export async function loginWithTenant(
  email: string,
  password: string,
  tenantId?: string
): Promise<{ 
  success: boolean; 
  user?: User; 
  tenantId?: string;
  error?: string;
}> {
  try {
    // 1. Authenticate the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error('Authentication failed');
    
    // 2. Get user's tenant access
    const { data: tenants, error: tenantsError } = await supabase
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
      .eq('user_id', authData.user.id)
      .eq('is_active', true);
      
    if (tenantsError) throw tenantsError;
    
    // 3. Determine which tenant to use
    let selectedTenantId = tenantId;
    
    // If no tenant specified, use default or first available
    if (!selectedTenantId) {
      const defaultTenant = tenants.find(t => t.is_default);
      selectedTenantId = defaultTenant ? 
        defaultTenant.tenant_id : 
        (tenants.length > 0 ? tenants[0].tenant_id : undefined);
    }
    
    // 4. Verify access to specified tenant
    if (selectedTenantId) {
      const hasTenantAccess = tenants.some(t => t.tenant_id === selectedTenantId);
      if (!hasTenantAccess) {
        throw new Error('User does not have access to the specified tenant');
      }
      
      // 5. Set tenant context
      await supabase.rpc('set_tenant_context', {
        tenant_id: selectedTenantId
      });
    }
    
    return {
      success: true,
      user: authData.user,
      tenantId: selectedTenantId
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

## RBAC Examples

### Permission Check

```typescript
/**
 * Standard permission check implementation
 */
export async function checkPermission(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string
): Promise<boolean> {
  // 1. Get tenant context
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    console.error('No tenant context established');
    return false;
  }
  
  // 2. Check for SuperAdmin status (tenant-independent)
  const { data: isAdmin, error: adminError } = await supabase.rpc(
    'is_super_admin',
    { user_id: userId }
  );
  
  if (adminError) {
    console.error('Error checking admin status:', adminError);
    return false;
  }
  
  if (isAdmin) {
    return true; // SuperAdmin has all permissions
  }
  
  // 3. Check specific permission in tenant context
  const { data, error } = await supabase.rpc(
    'check_user_permission',
    {
      user_id: userId,
      tenant_id: tenantId,
      action_name: action,
      resource_type: resourceType,
      resource_id: resourceId || null
    }
  );
  
  if (error) {
    console.error('Error checking permission:', error);
    return false;
  }
  
  return data === true;
}
```

## Multi-Tenant Examples

### Tenant Context Provider

```typescript
// React context for tenant management
export const TenantContext = createContext<{
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  setCurrentTenant: (tenantId: string) => Promise<boolean>;
  isLoading: boolean;
}>({
  currentTenant: null,
  availableTenants: [],
  setCurrentTenant: async () => false,
  isLoading: false
});

// Provider implementation
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { user } = useAuth();
  
  // Load user's tenant access
  useEffect(() => {
    if (!user) return;
    
    async function loadTenants() {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
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
        
        const tenants = data.map(ut => ({
          id: ut.tenant_id,
          name: ut.tenants.name,
          slug: ut.tenants.slug,
          isDefault: ut.is_default
        }));
        
        setAvailableTenants(tenants);
        
        // Set default tenant if none selected
        if (!currentTenant && tenants.length > 0) {
          const defaultTenant = tenants.find(t => t.isDefault) || tenants[0];
          await setCurrentTenant(defaultTenant.id);
        }
      } catch (error) {
        console.error('Error loading tenants:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTenants();
  }, [user]);
  
  // Function to change tenant context
  const setCurrentTenant = async (tenantId: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const tenant = availableTenants.find(t => t.id === tenantId);
      if (!tenant) {
        throw new Error('Tenant not found in available tenants');
      }
      
      // Set tenant context in database
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
      
      // Update local state
      setCurrentTenantState(tenant);
      
      // Store last used tenant
      localStorage.setItem(`lastTenant_${user?.id}`, tenantId);
      
      // Invalidate caches that may contain tenant-specific data
      queryClient.invalidateQueries();
      
      return true;
    } catch (error) {
      console.error('Error setting tenant:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        availableTenants,
        setCurrentTenant,
        isLoading
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};
```

## Audit Logging Examples

### Standard Audit Log Function

```typescript
/**
 * Standard audit logging function
 */
export async function logAuditEvent(
  eventType: string,
  data: Record<string, any>,
  metadata: {
    userId?: string;
    resourceId?: string;
    resourceType?: string;
    tenantId?: string;
  } = {}
): Promise<boolean> {
  try {
    // 1. Get current tenant context if not provided
    const tenantId = metadata.tenantId || getCurrentTenantId();
    
    // 2. Get current user if not provided
    const userId = metadata.userId || getCurrentUserId();
    
    if (!userId) {
      console.error('Cannot log audit event: No user context');
      return false;
    }
    
    // 3. Create audit log entry
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        event_type: eventType,
        user_id: userId,
        tenant_id: tenantId,
        resource_id: metadata.resourceId,
        resource_type: metadata.resourceType,
        event_data: data,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error logging audit event:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in audit logging:', error);
    return false;
  }
}
```

## Security Examples

### Input Validation

```typescript
/**
 * Standard input validation function
 */
export function validateInput(
  input: any,
  schema: z.ZodSchema
): { 
  isValid: boolean; 
  data?: any; 
  errors?: z.ZodError 
} {
  try {
    const validatedData = schema.parse(input);
    return {
      isValid: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error
      };
    }
    
    // Re-throw unexpected errors
    throw error;
  }
}

// Example usage with a schema
const userSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  tenantId: z.string().uuid()
});

// Validate user input
const validation = validateInput(userInput, userSchema);
if (validation.isValid) {
  // Process validated data
  processUser(validation.data);
} else {
  // Handle validation errors
  handleValidationErrors(validation.errors);
}
```

## UI Examples

### Tenant Selector Component

```tsx
/**
 * Standard tenant selector component
 */
export const TenantSelector: React.FC = () => {
  const { 
    currentTenant, 
    availableTenants, 
    setCurrentTenant, 
    isLoading 
  } = useTenantContext();
  
  if (availableTenants.length <= 1) {
    return null; // Don't show selector if only one tenant
  }
  
  return (
    <Select
      value={currentTenant?.id || ''}
      onValueChange={async (value) => {
        await setCurrentTenant(value);
      }}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select tenant" />
      </SelectTrigger>
      <SelectContent>
        {availableTenants.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

## Version History

- **1.0.0**: Initial core implementation examples (2025-05-23)
