
# Event Architecture Examples

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides practical examples following the standardized patterns from [EVENT_CORE_PATTERNS.md](EVENT_CORE_PATTERNS.md).

## Authentication Event Examples

```typescript
// User login success event
const loginSuccessEvent = createTenantEvent(
  EventType.USER_LOGIN_SUCCESS,
  'auth-service',
  {
    userId: 'user-123',
    sessionId: 'sess-456',
    loginMethod: 'password'
  },
  'tenant-789',
  {
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    sessionId: 'sess-456'
  }
);

await eventBus.emit(EventChannel.SECURITY, loginSuccessEvent);

// Login failure event
const loginFailedEvent = createEvent(
  EventType.USER_LOGIN_FAILED,
  'auth-service',
  {
    email: 'user@example.com',
    reason: 'invalid_credentials',
    attemptCount: 3
  },
  {
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  }
);

await eventBus.emit(EventChannel.SECURITY, loginFailedEvent);
```

## Permission Event Examples

```typescript
// Permission check event
const permissionCheckEvent = createTenantEvent(
  EventType.PERMISSION_CHECK,
  'rbac-service',
  {
    userId: 'user-123',
    resourceType: 'documents',
    action: 'view',
    resourceId: 'doc-456',
    result: 'granted',
    cached: true,
    checkDuration: 15 // milliseconds
  },
  'tenant-789',
  {
    userId: 'user-123',
    requestId: 'req-abc-123'
  }
);

await eventBus.emit(EventChannel.RBAC, permissionCheckEvent);

// Role assignment event
const roleAssignEvent = createTenantEvent(
  EventType.ROLE_ASSIGNED,
  'rbac-service',
  {
    targetUserId: 'user-456',
    roleId: 'role-admin',
    roleName: 'Administrator',
    assignedBy: 'user-123'
  },
  'tenant-789',
  {
    userId: 'user-123'
  }
);

await eventBus.emit(EventChannel.RBAC, roleAssignEvent);
```

## Data Access Event Examples

```typescript
// Data read event
const dataReadEvent = createTenantEvent(
  EventType.DATA_READ,
  'data-service',
  {
    table: 'documents',
    resourceIds: ['doc-1', 'doc-2', 'doc-3'],
    queryType: 'list',
    recordCount: 3,
    filters: { status: 'active' }
  },
  'tenant-789',
  {
    userId: 'user-123',
    requestId: 'req-def-456'
  }
);

await eventBus.emit(EventChannel.AUDIT, dataReadEvent);

// Data write event
const dataWriteEvent = createTenantEvent(
  EventType.DATA_WRITE,
  'data-service',
  {
    table: 'documents',
    operation: 'create',
    resourceId: 'doc-new-789',
    changes: {
      title: 'New Document',
      status: 'draft'
    }
  },
  'tenant-789',
  {
    userId: 'user-123',
    requestId: 'req-ghi-789'
  }
);

await eventBus.emit(EventChannel.AUDIT, dataWriteEvent);
```

## Security Event Examples

```typescript
// Security breach detection
const securityBreachEvent = createEvent(
  EventType.SECURITY_BREACH,
  'security-monitor',
  {
    severity: 'HIGH',
    breachType: 'multiple_failed_logins',
    targetUserId: 'user-123',
    attemptCount: 10,
    timeWindow: '5 minutes',
    sourceIps: ['192.168.1.100', '192.168.1.101']
  },
  {
    correlationId: 'security-alert-001'
  }
);

await eventBus.emitWithGuarantee(EventChannel.SECURITY, securityBreachEvent, {
  priority: 'high',
  deliveryDeadline: new Date(Date.now() + 30000) // 30 seconds
});

// Suspicious activity event
const suspiciousActivityEvent = createTenantEvent(
  EventType.SUSPICIOUS_ACTIVITY,
  'security-monitor',
  {
    activityType: 'unusual_data_access',
    userId: 'user-456',
    description: 'User accessed 100+ documents in 1 minute',
    riskScore: 8.5,
    triggers: ['high_volume_access', 'off_hours_activity']
  },
  'tenant-789',
  {
    userId: 'user-456',
    ip: '10.0.0.50'
  }
);

await eventBus.emit(EventChannel.SECURITY, suspiciousActivityEvent);
```

## Event Consumption Examples

```typescript
// Authentication event consumer
const authEventSubscription = eventBus.subscribe(
  EventChannel.SECURITY,
  async (event: DomainEvent<any>) => {
    if (event.type === EventType.USER_LOGIN_SUCCESS) {
      // Update user last login time
      await updateUserLastLogin(event.data.userId);
      
      // Log to audit system
      await auditLogger.log({
        eventType: 'user_login',
        userId: event.data.userId,
        tenantId: event.metadata?.tenantId,
        status: 'success',
        metadata: {
          sessionId: event.data.sessionId,
          ip: event.metadata?.ip
        }
      });
    }
  },
  {
    filter: (event) => event.type.startsWith('auth.user.'),
    batchSize: 10,
    maxConcurrency: 5
  }
);

// Permission event consumer
const rbacEventSubscription = eventBus.subscribe(
  EventChannel.RBAC,
  async (event: DomainEvent<any>) => {
    switch (event.type) {
      case EventType.PERMISSION_CHECK:
        // Update permission check metrics
        await metricsService.recordPermissionCheck({
          result: event.data.result,
          duration: event.data.checkDuration,
          cached: event.data.cached,
          tenantId: event.metadata?.tenantId
        });
        break;
        
      case EventType.ROLE_ASSIGNED:
        // Invalidate user permission cache
        await permissionCache.invalidateUser(event.data.targetUserId);
        
        // Send notification
        await notificationService.sendRoleAssignedNotification({
          userId: event.data.targetUserId,
          roleName: event.data.roleName,
          assignedBy: event.data.assignedBy
        });
        break;
    }
  },
  {
    filter: (event) => event.type.startsWith('rbac.'),
    maxConcurrency: 3
  }
);

// Cross-tenant event consumer with security validation
const crossTenantSubscription = eventBus.subscribe(
  EventChannel.TENANT,
  async (event: MultiTenantEvent<any>) => {
    // Validate cross-tenant access
    if (event.metadata.crossTenant) {
      const hasAccess = await validateCrossTenantAccess(
        event.metadata.userId,
        event.metadata.sourceTenantId,
        event.metadata.targetTenantId
      );
      
      if (!hasAccess) {
        console.warn('Unauthorized cross-tenant event:', event.id);
        return;
      }
    }
    
    // Process the event
    await processTenantEvent(event);
  },
  {
    filter: (event) => event.metadata?.tenantId !== undefined
  }
);
```

## Error Handling Examples

```typescript
// Event emission with error handling
async function emitEventSafely<T>(
  channel: string,
  event: DomainEvent<T>
): Promise<boolean> {
  try {
    // Validate event before emission
    const validation = validateEvent(event);
    if (!validation.isValid) {
      console.error('Invalid event:', validation.error);
      return false;
    }
    
    // Emit with timeout
    await Promise.race([
      eventBus.emit(channel, event),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Event emission timeout')), 5000)
      )
    ]);
    
    return true;
  } catch (error) {
    console.error('Event emission failed:', error);
    
    // Log to fallback system
    await fallbackLogger.logFailedEvent(event, error);
    
    return false;
  }
}

// Event consumption with retry logic
const retryableSubscription = eventBus.subscribe(
  EventChannel.AUDIT,
  async (event: DomainEvent<any>) => {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        await processAuditEvent(event);
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        console.error(`Event processing attempt ${attempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          // Send to dead letter queue
          await deadLetterQueue.add(event, error);
          break;
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempts) * 1000)
        );
      }
    }
  }
);
```

## Performance Monitoring Examples

```typescript
// Event performance monitoring
class EventMetricsCollector {
  async recordEventEmission(
    channel: string,
    eventType: string,
    duration: number,
    success: boolean
  ): Promise<void> {
    const metrics = {
      channel,
      eventType,
      duration,
      success,
      timestamp: new Date().toISOString()
    };
    
    // Record to metrics system
    await metricsService.record('event.emission', metrics);
    
    // Alert on slow events
    if (duration > 1000) { // 1 second
      await alertService.sendAlert({
        type: 'slow_event_emission',
        severity: 'warning',
        details: metrics
      });
    }
  }
  
  async recordEventProcessing(
    eventId: string,
    processorName: string,
    duration: number,
    success: boolean
  ): Promise<void> {
    const metrics = {
      eventId,
      processorName,
      duration,
      success,
      timestamp: new Date().toISOString()
    };
    
    await metricsService.record('event.processing', metrics);
    
    // Alert on processing failures
    if (!success) {
      await alertService.sendAlert({
        type: 'event_processing_failure',
        severity: 'error',
        details: metrics
      });
    }
  }
}
```

These examples demonstrate the consistent event patterns that should be used throughout the system for reliable, secure, and performant event-driven architecture.
