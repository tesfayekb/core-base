
# Core Implementation Patterns

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

Essential code patterns used throughout the system. These patterns are referenced by all implementation guides.

## Authentication Pattern

```typescript
// Standard authentication flow
const authenticateUser = async (credentials: AuthCredentials) => {
  // 1. Validate input
  validateCredentials(credentials);
  
  // 2. Verify against auth provider
  const user = await authProvider.verify(credentials);
  
  // 3. Create session with tenant context
  const session = await sessionManager.create({
    userId: user.id,
    tenantId: user.tenantId,
    permissions: await loadUserPermissions(user.id)
  });
  
  // 4. Log auth event
  await auditLogger.log({
    eventType: 'authentication',
    userId: user.id,
    success: true
  });
  
  return session;
};
```

## Permission Check Pattern

```typescript
// Standard permission check
const checkPermission = async (context: PermissionContext) => {
  // 1. Check cache first
  const cached = permissionCache.get(context);
  if (cached !== undefined) return cached;
  
  // 2. Check SuperAdmin
  if (await isUserSuperAdmin(context.userId)) {
    permissionCache.set(context, true);
    return true;
  }
  
  // 3. Direct permission lookup (no hierarchy)
  const hasPermission = await db.query(`
    SELECT 1 FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = ? 
    AND p.resource_type = ? 
    AND p.action = ?
    AND up.tenant_id = ?
  `, [context.userId, context.resourceType, context.action, context.tenantId]);
  
  // 4. Cache and return
  const result = hasPermission.length > 0;
  permissionCache.set(context, result);
  return result;
};
```

## Multi-Tenant Query Pattern

```typescript
// Standard multi-tenant query
const queryWithTenantContext = async <T>(options: QueryOptions<T>) => {
  // 1. Validate tenant context
  const tenantId = options.tenantId || await getCurrentTenantContext(options.userId);
  if (!tenantId) throw new Error('No tenant context');
  
  // 2. Check permission
  const hasPermission = await checkPermission({
    userId: options.userId,
    resourceType: options.table,
    action: 'ViewAny',
    tenantId
  });
  if (!hasPermission) throw new Error('Permission denied');
  
  // 3. Execute query with tenant filter
  const result = await db
    .select(options.fields)
    .from(options.table)
    .where('tenant_id', tenantId)
    .where(options.where || {});
  
  // 4. Log access
  await auditLogger.log({
    eventType: 'data_access',
    userId: options.userId,
    tenantId,
    resource: options.table,
    action: 'query'
  });
  
  return result;
};
```

## Audit Logging Pattern

```typescript
// Standard audit event
interface StandardAuditEvent {
  eventType: string;
  userId: string;
  tenantId?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const logAuditEvent = async (event: Omit<StandardAuditEvent, 'timestamp'>) => {
  const auditEvent: StandardAuditEvent = {
    ...event,
    timestamp: new Date()
  };
  
  // Sanitize PII
  const sanitizedEvent = sanitizePII(auditEvent);
  
  // Store event
  await auditStorage.store(sanitizedEvent);
  
  // Real-time monitoring if enabled
  if (config.realTimeAuditMonitoring) {
    auditEventEmitter.emit('audit', sanitizedEvent);
  }
};
```

## Critical Implementation Rules

1. **No Permission Hierarchy**: Use direct permission assignment only
2. **Tenant Isolation**: Every query must include tenant_id filter
3. **Audit Everything**: Log all user actions with standardized format
4. **Cache Permissions**: Cache permission checks for performance
5. **Validate Inputs**: Sanitize all user inputs before processing
6. **Error Handling**: Use consistent error patterns across system

## Pattern Usage Guidelines

### When to Use Each Pattern
- **Authentication**: Every user login/logout flow
- **Permission Check**: Before any protected resource access
- **Multi-Tenant Query**: All database queries in multi-tenant context
- **Audit Logging**: All user actions and system events

### Performance Considerations
- Cache permission results for 5 minutes
- Use connection pooling for database queries
- Batch audit log writes when possible
- Implement circuit breakers for external services

### Security Considerations
- Always validate tenant access before operations
- Sanitize all user inputs before processing
- Use parameterized queries to prevent injection
- Log security events for monitoring

These patterns provide the foundation for all system components and ensure consistency across the entire application.
