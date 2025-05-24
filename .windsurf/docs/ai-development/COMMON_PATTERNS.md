
# Common Development Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

This document outlines common implementation patterns for key system features.

## Authentication Flow

To implement authentication features, process these documents in sequence:

1. **[../security/AUTH_SYSTEM.md](../security/AUTH_SYSTEM.md)**: Authentication system architecture
2. **[../user-management/AUTHENTICATION.md](../user-management/AUTHENTICATION.md)**: User authentication implementation 
3. **[../security/COMMUNICATION_SECURITY.md](../security/COMMUNICATION_SECURITY.md)**: Securing authentication communication

```typescript
// Authentication implementation pattern
interface AuthCredentials {
  email: string;
  password: string;
  multiFactor?: {
    token: string;
    type: 'app' | 'sms' | 'email';
  };
}

async function authenticateUser(credentials: AuthCredentials): Promise<AuthResult> {
  // 1. Validate credentials format
  validateCredentials(credentials);
  
  // 2. Verify against authentication provider
  const authResult = await authProvider.verify(credentials);
  
  // 3. Check multi-factor requirements
  if (authResult.requiresMultiFactor && !credentials.multiFactor) {
    return { status: 'mfa_required', session: authResult.temporarySession };
  }
  
  // 4. Create session with appropriate tenant context
  const session = await sessionManager.create({
    userId: authResult.userId,
    tenantId: determineTenantContext(authResult),
    permissions: await loadPermissions(authResult.userId)
  });
  
  // 5. Log authentication event
  await auditLogger.log({
    eventType: 'authentication',
    userId: authResult.userId,
    success: true,
    metadata: { /* omit sensitive data */ }
  });
  
  return { status: 'success', session };
}
```

## Permission Check Flow

To implement permission checks, process these documents in sequence:

1. **[../rbac/PERMISSION_TYPES.md](../rbac/PERMISSION_TYPES.md)**: Understanding permission taxonomy
2. **[../rbac/permission-resolution/RESOLUTION_ALGORITHM.md](../rbac/permission-resolution/RESOLUTION_ALGORITHM.md)**: Permission resolution algorithm
3. **[../rbac/PERMISSION_QUERY_OPTIMIZATION.md](../rbac/PERMISSION_QUERY_OPTIMIZATION.md)**: Optimizing permission queries

```typescript
// Permission check implementation pattern
interface PermissionCheckContext {
  userId: string;
  resourceType: string;
  action: string;
  resourceId?: string;
  tenantId?: string;
}

async function checkPermission(context: PermissionCheckContext): Promise<boolean> {
  // 1. Try cache first
  const cacheKey = `${context.userId}:${context.tenantId || 'global'}:${context.resourceType}:${context.action}`;
  const cachedResult = permissionCache.get(cacheKey);
  if (cachedResult !== undefined) {
    return cachedResult;
  }
  
  // 2. Check for SuperAdmin status
  if (await isUserSuperAdmin(context.userId)) {
    permissionCache.set(cacheKey, true);
    return true;
  }
  
  // 3. Resolve effective tenant context
  const effectiveTenantId = context.tenantId || await getCurrentTenantContext(context.userId);
  if (!effectiveTenantId) {
    permissionCache.set(cacheKey, false);
    return false;
  }
  
  // 4. Check permission through optimized query
  const hasPermission = await permissionQuery.checkUserPermission({
    userId: context.userId,
    resourceType: context.resourceType,
    action: context.action,
    resourceId: context.resourceId,
    tenantId: effectiveTenantId
  });
  
  // 5. Cache result
  permissionCache.set(cacheKey, hasPermission);
  
  return hasPermission;
}
```

## Multi-Tenant Data Access

To implement multi-tenant data access, process these documents in sequence:

1. **[../multitenancy/DATA_ISOLATION.md](../multitenancy/DATA_ISOLATION.md)**: Tenant data isolation principles
2. **[../multitenancy/DATABASE_QUERY_PATTERNS.md](../multitenancy/DATABASE_QUERY_PATTERNS.md)**: Multi-tenant database query patterns
3. **[../multitenancy/DATABASE_PERFORMANCE.md](../multitenancy/DATABASE_PERFORMANCE.md)**: Performance optimization for multi-tenant queries

```typescript
// Multi-tenant query implementation pattern
interface QueryOptions<T> {
  table: string;
  fields: (keyof T)[] | '*';
  where?: Partial<T>;
  tenantId?: string;
  userId: string;
  limit?: number;
  offset?: number;
}

async function queryWithTenantContext<T>(options: QueryOptions<T>): Promise<T[]> {
  // 1. Determine effective tenant context
  const effectiveTenantId = options.tenantId || await getCurrentTenantContext(options.userId);
  if (!effectiveTenantId) {
    throw new Error('No tenant context available');
  }
  
  // 2. Check if user has permission to query this resource
  const hasPermission = await checkPermission({
    userId: options.userId,
    resourceType: options.table,
    action: 'ViewAny',
    tenantId: effectiveTenantId
  });
  
  if (!hasPermission) {
    throw new Error('Permission denied');
  }
  
  // 3. Construct query with tenant filter
  const query = db
    .select(options.fields)
    .from(options.table)
    .where('tenant_id', effectiveTenantId);
    
  if (options.where) {
    Object.entries(options.where).forEach(([key, value]) => {
      query.where(key, value);
    });
  }
  
  if (options.limit) query.limit(options.limit);
  if (options.offset) query.offset(options.offset);
  
  // 4. Execute query
  const result = await query;
  
  // 5. Log access for audit
  await auditLogger.log({
    eventType: 'data_access',
    userId: options.userId,
    tenantId: effectiveTenantId,
    resource: options.table,
    action: 'query',
    metadata: { fields: options.fields }
  });
  
  return result;
}
```

## Related Documentation

- **[../CORE_ARCHITECTURE.md](../CORE_ARCHITECTURE.md)**: Core architectural principles and patterns
- **[../AI_IMPLEMENTATION_EXAMPLES.md](../AI_IMPLEMENTATION_EXAMPLES.md)**: Code examples of key concepts

## Version History

- **1.0.0**: Initial common development patterns guide (2025-05-23)
