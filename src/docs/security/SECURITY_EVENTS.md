
# Security Event Logging

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the security event logging system that captures, processes, and stores security-related events for auditing and compliance.

## Canonical Event Architecture Reference

**IMPORTANT**: All security event integration follows the patterns defined in [../integration/EVENT_ARCHITECTURE.md](../integration/EVENT_ARCHITECTURE.md). This document provides security-specific details that extend the canonical event architecture.

## Security Event Categories

Security events are systematically captured through the audit logging framework:

1. **Event Categories**: Authentication, authorization, configuration, data access
   - Full categorization in [SECURITY_MONITORING.md](SECURITY_MONITORING.md)
   - Mapping to audit schema in [../audit/DATABASE_STRUCTURE.md](../audit/DATABASE_STRUCTURE.md)

2. **Event Context**: Each security event includes standardized context information
   - Context format defined in [../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)
   - Security-specific context attributes

3. **Integration**: Security events feed directly into the audit logging system
   - Technical integration detailed in [../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)
   - Event processing flows in [../audit/LOGGING_SERVICE.md](../audit/LOGGING_SERVICE.md)
   - Security control verification via events

4. **Performance Considerations**: Optimized event capture with minimal system impact
   - Performance architecture in [../audit/PERFORMANCE_STRATEGIES.md](../audit/PERFORMANCE_STRATEGIES.md)
   - Batched security event processing
   - Priority handling for critical security events

## Security Event Schema Extension

Security events extend the canonical BaseEvent schema defined in [../integration/EVENT_ARCHITECTURE.md](../integration/EVENT_ARCHITECTURE.md):

```typescript
// Extends DomainEvent<T> from canonical event architecture
interface SecurityEvent extends DomainEvent<SecurityEventData> {
  // Additional security-specific metadata
  metadata: {
    tenantId?: string;           // Multi-tenant context
    userId?: string;             // User that triggered the event
    sessionId?: string;          // User session ID
    ip?: string;                 // IP address
    userAgent?: string;          // User agent
    securityLevel: SecurityEventLevel; // Security severity
    [key: string]: any;
  };
}

interface SecurityEventData {
  eventType: SecurityEventType;
  subtype: string;
  details: Record<string, any>;
}

enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  CONFIGURATION = 'configuration',
  DATA_ACCESS = 'data_access',
  ADMIN_ACTION = 'admin_action',
  SECURITY_CONTROL = 'security_control',
  SYSTEM = 'system',
  ERROR = 'error'
}

enum SecurityEventLevel {
  DEBUG = 'debug',
  INFO = 'info',
  NOTICE = 'notice',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}
```

## Event Production Integration

Security events are produced using the canonical EventEmitter interface from [../integration/EVENT_ARCHITECTURE.md](../integration/EVENT_ARCHITECTURE.md):

```typescript
// Security event producer following canonical patterns
class SecurityEventProducer {
  private eventBus: EventEmitter;
  
  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
  }
  
  async logSecurityEvent(
    eventType: SecurityEventType,
    subtype: string,
    details: Record<string, any>,
    level: SecurityEventLevel = SecurityEventLevel.INFO
  ): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: generateUUID(),
      type: 'security',
      source: 'security-service',
      time: new Date().toISOString(),
      dataVersion: '1.0',
      data: {
        eventType,
        subtype,
        details
      },
      metadata: {
        securityLevel: level,
        tenantId: getCurrentTenantId(),
        userId: getCurrentUserId(),
        sessionId: getCurrentSessionId(),
        ip: getCurrentIP(),
        userAgent: getCurrentUserAgent()
      }
    };
    
    // Use canonical event bus with priority based on security level
    if (level === SecurityEventLevel.CRITICAL || level === SecurityEventLevel.ERROR) {
      await this.eventBus.emitWithGuarantee('security', securityEvent, {
        priority: 'high'
      });
    } else {
      await this.eventBus.emit('security', securityEvent);
    }
  }
}
```

## Security Event Types and Examples

### Authentication Events

```typescript
// Authentication event examples extending canonical schema
interface AuthenticationEventData {
  method: 'password' | 'social' | 'sso' | 'token';
  provider?: string;
  reason?: string;
  attemptCount?: number;
}

// Usage examples
await securityEventProducer.logSecurityEvent(
  SecurityEventType.AUTHENTICATION,
  'login_success',
  { method: 'password', provider: 'local' },
  SecurityEventLevel.INFO
);

await securityEventProducer.logSecurityEvent(
  SecurityEventType.AUTHENTICATION,
  'login_failure',
  { method: 'password', reason: 'invalid_credentials', attemptCount: 3 },
  SecurityEventLevel.WARNING
);
```

### Authorization Events

```typescript
// Authorization event examples
interface AuthorizationEventData {
  resource: string;
  action: string;
  roleId?: string;
  roleName?: string;
  permissionId?: string;
  targetUserId?: string;
}

// Usage examples
await securityEventProducer.logSecurityEvent(
  SecurityEventType.AUTHORIZATION,
  'permission_denied',
  { resource: 'users', action: 'delete', targetUserId: 'user-123' },
  SecurityEventLevel.WARNING
);
```

## Event Bus Channel Configuration

Security events use the 'security' channel as defined in the canonical event bus configuration from [../integration/EVENT_ARCHITECTURE.md](../integration/EVENT_ARCHITECTURE.md).

## Related Documentation

- **[../integration/EVENT_ARCHITECTURE.md](../integration/EVENT_ARCHITECTURE.md)**: **CANONICAL EVENT ARCHITECTURE REFERENCE**
- **[SECURITY_MONITORING.md](SECURITY_MONITORING.md)**: Security monitoring implementation
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: Audit integration details

## Version History

- **2.0.0**: Refactored to extend canonical event architecture from EVENT_ARCHITECTURE.md, removed duplicate event patterns (2025-05-23)
- **1.0.0**: Initial document created from OVERVIEW.md refactoring (2025-05-23)
