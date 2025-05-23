
# Event Architecture Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides practical examples of implementing the event architecture patterns defined in [EVENT_CORE_PATTERNS.md](EVENT_CORE_PATTERNS.md).

## Basic Event Production Example

```typescript
// Simple event emission
await eventBus.emit('security', {
  id: 'evt-123',
  type: 'user.login.success',
  source: 'auth-service',
  time: new Date().toISOString(),
  dataVersion: '1.0',
  data: {
    userId: 'user-456',
    sessionId: 'sess-789'
  },
  metadata: {
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    tenantId: 'tenant-123'
  }
});
```

## Event Consumption Example

```typescript
// Subscribe to security events
const subscription = eventBus.subscribe(
  'security',
  async (event) => {
    if (event.type === 'user.login.success') {
      await auditLogger.log({
        action: 'LOGIN',
        userId: event.data.userId,
        timestamp: event.time,
        tenantId: event.metadata?.tenantId
      });
    }
  },
  {
    filter: (event) => event.type.startsWith('user.'),
    batchSize: 10
  }
);
```

## Multi-Tenant Event Example

```typescript
// Cross-tenant operation event
await eventBus.emit('rbac', {
  id: 'evt-cross-456',
  type: 'permission.granted.cross_tenant',
  source: 'rbac-service',
  time: new Date().toISOString(),
  dataVersion: '1.0',
  data: {
    permission: 'documents.view',
    resourceId: 'doc-789'
  },
  metadata: {
    crossTenant: true,
    sourceTenantId: 'tenant-123',
    targetTenantId: 'tenant-456',
    user: 'user-admin'
  }
});
```

## RBAC Permission Event Example

```typescript
// Permission check event
await eventBus.emit('rbac', {
  id: 'evt-perm-789',
  type: 'permission.check.completed',
  source: 'permission-service',
  time: new Date().toISOString(),
  dataVersion: '1.0',
  data: {
    userId: 'user-123',
    resource: 'documents',
    action: 'view',
    result: 'granted',
    cached: true
  },
  metadata: {
    tenantId: 'tenant-456',
    user: 'user-123',
    requestId: 'req-abc'
  }
});
```

## Audit Event Example

```typescript
// Audit log event
await eventBus.emit('audit', {
  id: 'evt-audit-101',
  type: 'audit.log.created',
  source: 'audit-service',
  time: new Date().toISOString(),
  dataVersion: '1.0',
  data: {
    action: 'DOCUMENT_CREATED',
    resourceType: 'document',
    resourceId: 'doc-new-123',
    outcome: 'SUCCESS'
  },
  metadata: {
    tenantId: 'tenant-456',
    user: 'user-123',
    ip: '192.168.1.1'
  }
});
```

## Error Handling Example

```typescript
// Event with error handling
try {
  await eventBus.emitWithGuarantee('security', {
    id: 'evt-critical-999',
    type: 'security.breach.detected',
    source: 'security-monitor',
    time: new Date().toISOString(),
    dataVersion: '1.0',
    data: {
      severity: 'HIGH',
      details: 'Multiple failed login attempts'
    }
  }, {
    priority: 'high',
    deliveryDeadline: new Date(Date.now() + 5000) // 5 seconds
  });
} catch (error) {
  console.error('Failed to emit critical security event:', error);
  // Fallback mechanism
  await fallbackAlertService.sendAlert(event);
}
```

## Filtering and Routing Example

```typescript
// Advanced event filtering
const auditSubscription = eventBus.subscribe(
  'audit',
  async (event) => {
    await processAuditEvent(event);
  },
  {
    filter: (event) => {
      // Only process events for specific tenant
      return event.metadata?.tenantId === 'tenant-123' &&
             event.data.outcome === 'SUCCESS';
    },
    batchSize: 5,
    maxConcurrency: 3
  }
);
```

## Related Documentation

- [Event Core Patterns](EVENT_CORE_PATTERNS.md): Core event patterns and schemas
- [Event Implementation Guide](EVENT_IMPLEMENTATION_GUIDE.md): Implementation details
- [../audit/LOG_FORMAT_STANDARDIZATION.md](../audit/LOG_FORMAT_STANDARDIZATION.md): Log format requirements

## Version History

- **1.0.0**: Extracted examples from EVENT_ARCHITECTURE.md for better organization (2025-05-23)
