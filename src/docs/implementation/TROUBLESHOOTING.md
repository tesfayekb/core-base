
# Troubleshooting Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Common Integration Issues

### Authentication Issues

#### Issue: "User already registered" error
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

#### Issue: Tenant context not persisting
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

#### Issue: Authentication state not updating in UI
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

### Database Issues

#### Issue: `relation "tenants" does not exist`
```bash
# Solution: Reset and apply migrations
supabase db reset
supabase db push
```

#### Issue: RLS policies blocking legitimate access
```sql
-- Debug: Check current tenant context
SELECT current_setting('app.tenant_id', true);

-- Fix: Ensure tenant context is set before queries
SELECT set_tenant_context('your-tenant-id');
```

#### Issue: UUID generation not working
```sql
-- Verify uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### RBAC Issues

#### Issue: Permission function returns null instead of boolean
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

#### Issue: Permissions not updating after role changes
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

## Debugging Strategies

### Database Debugging
1. Verify table existence and schema
2. Check RLS policies
3. Test queries with and without tenant context
4. Examine transaction logs

### Auth Debugging
1. Check user existence and metadata
2. Verify token validity and expiration
3. Test session persistence
4. Validate CORS settings

### RBAC Debugging
1. Test permission checks directly in database
2. Verify role assignments
3. Check permission resolution paths
4. Clear permission caches

## Version History

- **1.0.0**: Initial troubleshooting guide (2025-05-23)
