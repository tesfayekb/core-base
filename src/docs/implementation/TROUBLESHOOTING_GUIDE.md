
# Implementation Troubleshooting Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Comprehensive troubleshooting guide for common integration issues encountered during implementation phases.

## Database Integration Issues

### Issue: Row Level Security (RLS) Blocking Legitimate Access

**Symptoms:**
- Queries return empty results unexpectedly
- `permission denied for table` errors
- Data visible in database but not in application

**Diagnosis Steps:**
```sql
-- 1. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 2. Check current policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'your_table';

-- 3. Test tenant context
SELECT current_setting('app.tenant_id', true);
```

**Solutions:**

1. **Verify Tenant Context is Set**
```typescript
// Always set tenant context before queries
await supabase.rpc('set_tenant_context', { 
  tenant_id: getCurrentTenantId() 
});

// Then execute your query
const { data, error } = await supabase
  .from('your_table')
  .select('*');
```

2. **Debug RLS Policies**
```sql
-- Temporarily disable RLS for debugging (NEVER in production)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- Test your query
SELECT * FROM your_table;

-- Re-enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

3. **Fix Common Policy Issues**
```sql
-- Ensure policies handle NULL tenant context
CREATE POLICY "tenant_isolation" ON your_table
FOR ALL USING (
  tenant_id = COALESCE(
    current_setting('app.tenant_id', true)::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  )
);
```

### Issue: Migration Failures

**Symptoms:**
- `supabase db push` fails
- Conflicting migration files
- Database schema out of sync

**Diagnosis Steps:**
```bash
# Check migration status
supabase migration list

# Check for conflicts
supabase db diff

# Verify database connection
supabase status
```

**Solutions:**

1. **Reset Database (Development Only)**
```bash
# Reset and reapply all migrations
supabase db reset
supabase db push
```

2. **Manual Conflict Resolution**
```bash
# Create new migration for fixes
supabase migration new fix_conflicts

# Edit the migration file manually
# Then apply it
supabase db push
```

3. **Schema Synchronization**
```bash
# Generate migration from current schema
supabase db diff --schema public > fix_schema.sql
# Review and apply the changes
```

## Authentication Integration Issues

### Issue: Infinite Authentication Loops

**Symptoms:**
- User gets stuck in login/logout cycle
- Authentication state keeps changing
- Multiple auth state change events firing

**Diagnosis Steps:**
```typescript
// Add debugging to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session);
  console.log('User:', session?.user);
});
```

**Solutions:**

1. **Prevent Auth State Loops**
```typescript
// Use a ref to prevent loops
const authInitialized = useRef(false);

useEffect(() => {
  if (authInitialized.current) return;
  
  const initAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    authInitialized.current = true;
  };
  
  initAuth();
}, []);
```

2. **Debounce Auth State Changes**
```typescript
const debouncedAuthChange = useMemo(
  () => debounce((event, session) => {
    setUser(session?.user ?? null);
  }, 100),
  []
);

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    debouncedAuthChange
  );
  
  return () => subscription.unsubscribe();
}, [debouncedAuthChange]);
```

### Issue: Session Not Persisting

**Symptoms:**
- User logged out on page refresh
- Session expires immediately
- Authentication state resets

**Solutions:**

1. **Check Storage Configuration**
```typescript
// Ensure proper storage configuration
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      storageKey: 'supabase-auth',
      storage: window.localStorage
    }
  }
);
```

2. **Verify Domain Configuration**
```typescript
// Check site URL in Supabase dashboard
// Ensure it matches your application domain
```

## RBAC Integration Issues

### Issue: Permission Checks Always Return False

**Symptoms:**
- All permission checks fail
- Users can't access any features
- Permission functions return false for valid users

**Diagnosis Steps:**
```sql
-- 1. Check user roles
SELECT u.email, ur.role_id, r.name, r.permissions
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'test@example.com';

-- 2. Test permission function directly
SELECT check_user_permission(
  'user-id'::UUID,
  'Read',
  'users'
);
```

**Solutions:**

1. **Fix Permission Function Logic**
```sql
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
  permission_string TEXT;
BEGIN
  -- Build permission string
  permission_string := action_name || ':' || resource_name;
  
  -- Get user's tenant
  SELECT tenant_id INTO user_tenant_id 
  FROM auth.users 
  WHERE id = user_id;
  
  IF user_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Set tenant context
  PERFORM set_tenant_context(user_tenant_id);
  
  -- Check permission
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_permission.user_id
    AND r.tenant_id = user_tenant_id
    AND permission_string = ANY(r.permissions)
  ) INTO has_permission;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql;
```

2. **Add Debug Logging**
```typescript
class PermissionService {
  async checkPermission(userId: string, action: string, resource: string) {
    console.log(`Checking permission: ${action}:${resource} for user ${userId}`);
    
    const { data, error } = await supabase.rpc('check_user_permission', {
      user_id: userId,
      action_name: action,
      resource_name: resource
    });
    
    console.log('Permission check result:', { data, error });
    
    if (error) {
      console.error('Permission check error:', error);
      return false;
    }
    
    return data === true;
  }
}
```

### Issue: Role Assignment Failures

**Symptoms:**
- Cannot assign roles to users
- Role assignments don't persist
- Foreign key constraint errors

**Solutions:**

1. **Validate Role Assignment Data**
```typescript
async function assignRole(userId: string, roleId: string) {
  try {
    // Validate inputs
    if (!userId || !roleId) {
      throw new Error('User ID and Role ID are required');
    }
    
    // Check if user exists
    const { data: user } = await supabase
      .from('auth.users')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if role exists
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .single();
      
    if (!role) {
      throw new Error('Role not found');
    }
    
    // Assign role
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role_id: roleId
      });
      
    if (error) throw error;
    
  } catch (error) {
    console.error('Role assignment failed:', error);
    throw error;
  }
}
```

## Multi-Tenant Integration Issues

### Issue: Cross-Tenant Data Leakage

**Symptoms:**
- Users see data from other tenants
- Queries return unfiltered results
- Security boundaries not enforced

**Diagnosis Steps:**
```sql
-- Check for data without tenant_id
SELECT COUNT(*) as untenanted_records
FROM your_table 
WHERE tenant_id IS NULL;

-- Test cross-tenant query
SELECT set_tenant_context('tenant-1');
SELECT COUNT(*) FROM your_table; -- Should only show tenant-1 data

SELECT set_tenant_context('tenant-2');
SELECT COUNT(*) FROM your_table; -- Should only show tenant-2 data
```

**Solutions:**

1. **Ensure All Tables Have Tenant ID**
```sql
-- Add tenant_id to existing tables
ALTER TABLE your_table 
ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Create index for performance
CREATE INDEX idx_your_table_tenant_id ON your_table(tenant_id);

-- Update RLS policy
CREATE POLICY "tenant_isolation" ON your_table
FOR ALL USING (tenant_id = get_current_tenant_id());
```

2. **Validate Tenant Context in Application**
```typescript
// Always validate tenant context before queries
class TenantAwareService {
  private async ensureTenantContext() {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context available');
    }
    
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
    return tenantId;
  }
  
  async getData() {
    await this.ensureTenantContext();
    
    const { data, error } = await supabase
      .from('your_table')
      .select('*');
      
    return { data, error };
  }
}
```

## Performance Issues

### Issue: Slow Permission Checks

**Symptoms:**
- Page loads taking > 2 seconds
- Permission checks timing out
- High database CPU usage

**Diagnosis Steps:**
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%check_user_permission%'
ORDER BY mean_exec_time DESC;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('user_roles', 'roles')
ORDER BY n_distinct;
```

**Solutions:**

1. **Add Performance Indexes**
```sql
-- Index for user roles lookups
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Index for permission checks
CREATE INDEX idx_roles_tenant_permissions ON roles(tenant_id, permissions);

-- Composite index for common queries
CREATE INDEX idx_user_roles_user_tenant ON user_roles(user_id, role_id);
```

2. **Implement Permission Caching**
```typescript
class CachedPermissionService {
  private cache = new Map<string, { permissions: string[], expires: number }>();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  async checkPermission(userId: string, action: string, resource: string) {
    const cacheKey = `${userId}:permissions`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      const permission = `${action}:${resource}`;
      return cached.permissions.includes(permission);
    }
    
    // Fetch from database
    const permissions = await this.getUserPermissions(userId);
    
    // Cache results
    this.cache.set(cacheKey, {
      permissions,
      expires: Date.now() + this.CACHE_TTL
    });
    
    const permission = `${action}:${resource}`;
    return permissions.includes(permission);
  }
  
  clearCache(userId: string) {
    this.cache.delete(`${userId}:permissions`);
  }
}
```

## Frontend Integration Issues

### Issue: UI Not Reflecting Permission Changes

**Symptoms:**
- Buttons/menus don't update after role changes
- Users see unauthorized content
- Permission state stale in UI

**Solutions:**

1. **Implement Permission Context**
```typescript
const PermissionContext = createContext<{
  permissions: string[];
  refreshPermissions: () => void;
}>({
  permissions: [],
  refreshPermissions: () => {}
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const { user } = useAuth();
  
  const refreshPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      return;
    }
    
    const userPermissions = await permissionService.getUserPermissions(user.id);
    setPermissions(userPermissions.map(p => `${p.action}:${p.resource}`));
  }, [user]);
  
  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);
  
  return (
    <PermissionContext.Provider value={{ permissions, refreshPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
}
```

2. **Auto-refresh on Role Changes**
```typescript
// Listen for role change events
useEffect(() => {
  const subscription = supabase
    .channel('user_roles')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'user_roles',
        filter: `user_id=eq.${user?.id}`
      },
      () => {
        refreshPermissions();
      }
    )
    .subscribe();
    
  return () => subscription.unsubscribe();
}, [user?.id, refreshPermissions]);
```

## Error Handling Patterns

### Generic Error Handler

```typescript
class ErrorHandler {
  static handle(error: any, context: string) {
    console.error(`Error in ${context}:`, error);
    
    if (error.code === 'PGRST301') {
      // RLS policy violation
      return 'Access denied. Please check your permissions.';
    }
    
    if (error.code === '23505') {
      // Unique constraint violation
      return 'This item already exists.';
    }
    
    if (error.code === '23503') {
      // Foreign key constraint violation
      return 'Related item not found.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
}
```

### Retry Logic for Transient Failures

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## Prevention Strategies

### 1. Comprehensive Testing

```typescript
// Integration test example
describe('RBAC Integration', () => {
  it('should enforce permission boundaries', async () => {
    // Create test user with limited permissions
    const user = await createTestUser();
    await assignRole(user.id, 'limited-role');
    
    // Test permission enforcement
    const hasPermission = await permissionService.checkPermission(
      user.id, 'Delete', 'users'
    );
    
    expect(hasPermission).toBe(false);
  });
});
```

### 2. Monitoring and Alerting

```typescript
// Performance monitoring
const performanceTracker = {
  trackPermissionCheck: (duration: number) => {
    if (duration > 100) { // > 100ms
      console.warn(`Slow permission check: ${duration}ms`);
    }
  }
};
```

### 3. Development Guidelines

- Always set tenant context before database operations
- Use type-safe permission checks
- Implement comprehensive error handling
- Add performance monitoring to critical paths
- Test all integration points thoroughly

## Related Documentation

- **[PRACTICAL_IMPLEMENTATION_GUIDE.md](PRACTICAL_IMPLEMENTATION_GUIDE.md)**: Main implementation guide
- **[STEP_BY_STEP_PHASE1.md](STEP_BY_STEP_PHASE1.md)**: Phase 1 detailed steps
- **[DEBUGGING_PATTERNS.md](DEBUGGING_PATTERNS.md)**: Advanced debugging strategies

## Version History

- **1.0.0**: Initial comprehensive troubleshooting guide (2025-05-23)
