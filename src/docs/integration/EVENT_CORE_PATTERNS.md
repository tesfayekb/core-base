
# Event Architecture Core Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document defines the core event patterns that must be implemented consistently across all subsystems. This is the canonical reference for event-driven architecture patterns.

## Standard Event Schema

All events across all subsystems MUST follow this standardized schema:

```typescript
interface BaseEvent {
  id: string;                // Unique event identifier
  type: string;              // Event type identifier
  source: string;            // System component that generated the event
  time: string;              // ISO timestamp when the event occurred
  dataVersion: string;       // Schema version for the data payload
  correlationId?: string;    // Request correlation ID for tracing
}

interface DomainEvent<T> extends BaseEvent {
  data: T;                   // Event-specific data payload
  metadata?: {               // Optional metadata
    user?: string;           // User associated with the event
    ip?: string;             // Originating IP address
    userAgent?: string;      // Originating user agent
    entityId?: string;       // Entity context for multi-tenant events
    tenantId?: string;       // Tenant identifier for multi-tenant systems
    [key: string]: any;      // Additional metadata
  };
}
```

## Canonical Event Types

The system defines these primary event categories:

1. **Security Events**: Authentication events, security configuration changes, security policy enforcement
2. **RBAC Events**: Permission check events, role assignment events, permission configuration changes
3. **Audit Events**: System audit events, user activity events, compliance-related events
4. **System Events**: Application lifecycle events, error and exception events, performance monitoring events

## Multi-Tenant Event Schema

```typescript
interface MultiTenantEvent<T> extends DomainEvent<T> {
  metadata: {
    tenantId: string;           // Required for multi-tenant events
    crossTenant?: boolean;      // Flag for cross-tenant operations
    sourceTenantId?: string;    // For cross-tenant events
    targetTenantId?: string;    // For cross-tenant events
    user?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: any;
  };
}
```

## Event Production Interface

```typescript
interface EventEmitter {
  emit<T extends BaseEvent>(channel: string, event: T): Promise<void>;
  emitWithGuarantee<T extends BaseEvent>(
    channel: string, 
    event: T, 
    options?: {
      priority?: 'high' | 'normal' | 'low';
      idempotencyKey?: string;
      deliveryDeadline?: Date;
    }
  ): Promise<void>;
}
```

## Event Consumption Interface

```typescript
interface EventConsumer {
  subscribe<T extends BaseEvent>(
    channel: string, 
    handler: (event: T) => Promise<void>,
    options?: {
      filter?: (event: T) => boolean;
      batchSize?: number;
      maxConcurrency?: number;
    }
  ): Subscription;
  
  unsubscribe(subscription: Subscription): void;
}
```

## Related Documentation

- [Event Implementation Guide](EVENT_IMPLEMENTATION_GUIDE.md): Implementation details
- [Event Examples](EVENT_EXAMPLES.md): Code examples and patterns
- [../audit/LOG_FORMAT_STANDARDIZATION.md](../audit/LOG_FORMAT_STANDARDIZATION.md): Log format requirements

## Version History

- **1.0.0**: Extracted core patterns from EVENT_ARCHITECTURE.md for better maintainability (2025-05-23)
