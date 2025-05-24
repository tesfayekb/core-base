
# Multi-Tenant Implementation Examples

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

Concrete multi-tenant implementation examples showing tenant isolation and management patterns.

## Tenant Context Management

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

## Tenant-Aware Repository Pattern

```typescript
// Generic tenant-aware repository implementation
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
  
  async findAll(options?: { 
    limit?: number; 
    offset?: number;
    where?: Record<string, any>;
  }): Promise<T[]> {
    const tenantId = this.tenantService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context established');
    }
    
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId);
      
    // Add additional where conditions
    if (options?.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
      
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(
        options.offset, 
        options.offset + (options.limit || 10) - 1
      );
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

## Multi-Tenant API Controllers

```typescript
// Base API controller with multi-tenant support
export abstract class MultiTenantApiController {
  constructor(
    protected permissionService: PermissionService,
    protected auditLogger: AuditLogger,
    protected resourceType: string
  ) {}
  
  protected async checkPermission(
    req: Request,
    action: string,
    resourceId?: string
  ): Promise<boolean> {
    const userId = req.user?.id;
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      return false;
    }
    
    return this.permissionService.checkPermission({
      userId,
      resourceType: this.resourceType,
      action,
      resourceId,
      tenantId
    });
  }
  
  protected logAccess(
    req: Request, 
    action: string, 
    status: 'success' | 'denied' | 'error'
  ): void {
    const userId = req.user?.id;
    const tenantId = req.headers['x-tenant-id'] as string;
    
    this.auditLogger.log({
      eventType: 'api_access',
      userId: userId || 'anonymous',
      tenantId,
      resource: this.resourceType,
      action,
      status,
      metadata: {
        path: req.path,
        method: req.method,
        ip: req.ip
      }
    });
  }
  
  // Standard handler with permission check
  protected createHandler(action: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 1. Check permission
        const hasPermission = await this.checkPermission(req, action);
        
        if (!hasPermission) {
          this.logAccess(req, action, 'denied');
          return res.status(403).json({ error: 'Permission denied' });
        }
        
        // 2. Apply tenant filter to query
        const tenantId = req.headers['x-tenant-id'] as string;
        req.tenantContext = { tenantId };
        
        // 3. Proceed with handler
        this.logAccess(req, action, 'success');
        next();
      } catch (e) {
        const error = e as Error;
        this.logAccess(req, action, 'error');
        res.status(500).json({ error: error.message });
      }
    };
  }
}

// Example implementation
export class UserController extends MultiTenantApiController {
  constructor() {
    super(permissionService, auditLogger, 'users');
  }
  
  // GET /api/users
  getUsers = this.createHandler('viewAny');
  
  async getUsersHandler(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantContext?.tenantId;
      const repository = new TenantAwareRepository<User>('users', tenantService);
      
      const users = await repository.findAll({
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0
      });
      
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching users' });
    }
  }
  
  // POST /api/users
  createUser = this.createHandler('create');
  
  async createUserHandler(req: Request, res: Response): Promise<void> {
    try {
      const repository = new TenantAwareRepository<User>('users', tenantService);
      const newUser = await repository.create(req.body);
      
      res.status(201).json({ user: newUser });
    } catch (error) {
      res.status(500).json({ error: 'Error creating user' });
    }
  }
}
```

## Tenant Provisioning

```typescript
// Tenant creation with initial setup
export async function createTenant(
  tenantData: {
    name: string;
    slug: string;
    settings?: Record<string, any>;
  },
  ownerUserId: string
): Promise<{ tenantId: string; success: boolean }> {
  const client = await supabase.auth.getSession();
  
  try {
    // Start transaction
    const { data: transaction, error: txError } = await supabase.rpc('start_transaction');
    if (txError) throw txError;
    
    // 1. Create tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenantData.name,
        slug: tenantData.slug,
        settings: tenantData.settings || {},
        created_by: ownerUserId
      })
      .select('id')
      .single();
      
    if (tenantError) throw tenantError;
    
    // 2. Create default roles for the tenant
    const defaultRoles = [
      { name: 'TenantAdmin', description: 'Tenant administrator' },
      { name: 'User', description: 'Regular tenant user' },
      { name: 'Viewer', description: 'Read-only access' }
    ];
    
    const { data: createdRoles, error: rolesError } = await supabase
      .from('roles')
      .insert(defaultRoles.map(role => ({
        ...role,
        tenant_id: tenant.id
      })))
      .select('id, name');
      
    if (rolesError) throw rolesError;
    
    // 3. Assign tenant admin role to owner
    const adminRole = createdRoles.find(r => r.name === 'TenantAdmin');
    if (adminRole) {
      const { error: roleAssignError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: ownerUserId,
          tenant_id: tenant.id,
          role_id: adminRole.id,
          is_default: true
        });
        
      if (roleAssignError) throw roleAssignError;
    }
    
    // 4. Create initial tenant resources/permissions
    await supabase.rpc('provision_tenant_resources', {
      tenant_id: tenant.id,
      created_by: ownerUserId
    });
    
    // 5. Commit transaction
    await supabase.rpc('commit_transaction', {
      transaction_id: transaction.transaction_id
    });
    
    // 6. Log tenant creation for audit
    await supabase.rpc('log_tenant_created', {
      tenant_id: tenant.id,
      created_by: ownerUserId
    });
    
    return { tenantId: tenant.id, success: true };
  } catch (error) {
    console.error('Error creating tenant:', error);
    
    // Rollback transaction
    try {
      await supabase.rpc('rollback_transaction');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    return { tenantId: '', success: false };
  }
}
```

## Tenant Switching Component

```typescript
// Tenant selection UI component
export const TenantSelector: React.FC = () => {
  const { 
    tenantId, 
    tenantName, 
    availableTenants, 
    setCurrentTenant, 
    isLoadingTenants 
  } = useTenant();
  
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  
  const handleTenantSwitch = async (newTenantId: string) => {
    setSwitching(true);
    try {
      const success = await setCurrentTenant(newTenantId);
      if (success) {
        setIsOpen(false);
        toast.success('Switched tenant successfully');
      } else {
        toast.error('Failed to switch tenant');
      }
    } catch (error) {
      toast.error('Error switching tenant');
    } finally {
      setSwitching(false);
    }
  };
  
  if (isLoadingTenants) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        <span>Loading tenants...</span>
      </div>
    );
  }
  
  if (availableTenants.length === 0) {
    return <div className="text-gray-500">No accessible tenants</div>;
  }
  
  if (availableTenants.length === 1) {
    return (
      <div className="flex items-center space-x-2">
        <Building className="h-4 w-4" />
        <span>{tenantName}</span>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        disabled={switching}
      >
        <Building className="h-4 w-4" />
        <span>{tenantName || 'Select Tenant'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {availableTenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleTenantSwitch(tenant.id)}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                tenant.id === tenantId ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
              }`}
              disabled={switching}
            >
              <div className="flex items-center justify-between">
                <span>{tenant.name}</span>
                {tenant.id === tenantId && <Check className="h-4 w-4" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Related Examples

- **Authentication Examples**: `AUTH_EXAMPLES.md`
- **Permission Examples**: `PERMISSION_EXAMPLES.md`
- **Audit Examples**: `AUDIT_EXAMPLES.md`

These multi-tenant examples demonstrate comprehensive tenant isolation and management patterns.
