
# Multi-Tenant Foundation Checklist

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

Essential checklist for implementing multi-tenant foundation features. Complete this before moving to advanced multi-tenant features.

## Phase 1: Database Foundation

### Schema Setup
- [ ] **Create tenants table** with id, name, slug, settings, timestamps
- [ ] **Create user_tenants table** linking users to tenants with roles
- [ ] **Add tenant_id column** to all tenant-scoped tables
- [ ] **Enable Row Level Security (RLS)** on all tenant-scoped tables

### Essential Database Functions
```sql
-- Required functions to implement
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN nullif(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RLS Policies
- [ ] **Create tenant isolation policies** for each table
- [ ] **Test policy enforcement** with multiple tenant contexts
- [ ] **Verify cross-tenant access prevention**

Example RLS Policy:
```sql
CREATE POLICY tenant_isolation_policy ON table_name
  USING (tenant_id = current_tenant_id());
```

## Phase 2: Authentication Integration

### Tenant-Aware Authentication
- [ ] **Modify login flow** to include tenant selection
- [ ] **Store tenant context** in JWT tokens or session
- [ ] **Implement tenant switching** without re-authentication
- [ ] **Add tenant validation** to all authenticated requests

### Session Management
- [ ] **Preserve tenant context** across requests
- [ ] **Handle tenant switching** with permission re-evaluation
- [ ] **Implement tenant access validation**

## Phase 3: API Integration

### Middleware Setup
- [ ] **Create tenant context middleware** for all API routes
- [ ] **Validate tenant access** for each request
- [ ] **Set database tenant context** automatically
- [ ] **Add tenant ID to all audit logs**

### Query Pattern Implementation
- [ ] **Ensure all queries include tenant filtering**
- [ ] **Use parameterized queries** with tenant context
- [ ] **Implement tenant-aware pagination**
- [ ] **Add tenant validation** to all CRUD operations

## Foundation Validation

### Before Proceeding to Advanced Features
- [ ] **All tables have tenant_id** and RLS policies
- [ ] **All queries filter by tenant** context
- [ ] **Cross-tenant access is impossible** for regular users
- [ ] **Tenant switching works** without data leakage
- [ ] **All operations are audited** with tenant context

### Security Validation
- [ ] **Cannot access other tenant data** through UI
- [ ] **Cannot access other tenant data** through API
- [ ] **Cannot bypass tenant isolation** through database
- [ ] **Session hijacking doesn't grant** cross-tenant access

## Quick Reference Patterns

### Middleware Pattern
```typescript
export function requireTenantContext(req, res, next) {
  const tenantId = req.headers['x-tenant-id'] || req.user?.currentTenantId;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context required' });
  }
  
  // Validate user has access to tenant
  const hasAccess = await validateTenantAccess(req.user.id, tenantId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Tenant access denied' });
  }
  
  // Set tenant context
  await setTenantContext(tenantId);
  req.tenantId = tenantId;
  next();
}
```

### Query Pattern
```typescript
// Always include tenant context in queries
async function getResources(tenantId: string) {
  await setTenantContext(tenantId);
  return await db.query('SELECT * FROM resources WHERE tenant_id = $1', [tenantId]);
}
```

## Troubleshooting Common Issues

### Data Isolation Problems
- **Symptom**: Users see data from other tenants
- **Solution**: Check RLS policies and tenant context setting
- **Validation**: Query `current_tenant_id()` in problematic queries

### Performance Issues
- **Symptom**: Slow queries with many tenants
- **Solution**: Add compound indexes with tenant_id as first column
- **Validation**: Analyze query execution plans

## Next Steps

After completing this foundation checklist:
- Use `ADVANCED_CHECKLIST.md` for advanced multi-tenant features
- Reference `IMPLEMENTATION_EXAMPLES.md` for detailed code examples
- Check `../rbac/AI_PERMISSION_IMPLEMENTATION_GUIDE.md` for permission integration

This foundation checklist ensures secure multi-tenant isolation before building advanced features.
