
# Event Architecture Core Patterns

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-23

## Overview

This document defines the core event patterns that must be implemented consistently across all subsystems. All event implementations must follow these standardized patterns.

## Standard Event Schema

```typescript
// Base event interface - ALL events must extend this
interface BaseEvent {
  id: string;                // UUID v4
  type: string;              // dot-notation: system.component.action
  source: string;            // component that generated the event
  time: string;              // ISO 8601 timestamp
  dataVersion: string;       // Schema version (e.g., "1.0")
  correlationId?: string;    // Request correlation ID for tracing
}

// Domain event with typed data payload
interface DomainEvent<T> extends BaseEvent {
  data: T;                   // Strongly typed event data
  metadata?: EventMetadata;  // Optional standardized metadata
}

// Standardized metadata structure
interface EventMetadata {
  userId?: string;           // User associated with the event
  tenantId?: string;         // Tenant context (required for multi-tenant events)
  ip?: string;               // Originating IP address
  userAgent?: string;        // Originating user agent
  sessionId?: string;        // Session identifier
  requestId?: string;        // Request identifier for tracing
  [key: string]: any;        // Additional context-specific metadata
}
```

## Multi-Tenant Event Schema

```typescript
// Multi-tenant events MUST include tenant context
interface MultiTenantEvent<T> extends DomainEvent<T> {
  metadata: EventMetadata & {
    tenantId: string;           // Required for all multi-tenant events
    crossTenant?: boolean;      // Flag for cross-tenant operations
    sourceTenantId?: string;    // Source tenant for cross-tenant events
    targetTenantId?: string;    // Target tenant for cross-tenant events
  };
}
```

## Event Categories and Types

```typescript
// Standardized event type patterns
enum EventType {
  // Authentication events
  USER_LOGIN_SUCCESS = 'auth.user.login.success',
  USER_LOGIN_FAILED = 'auth.user.login.failed',
  USER_LOGOUT = 'auth.user.logout',
  SESSION_EXPIRED = 'auth.session.expired',

  // Permission events
  PERMISSION_GRANTED = 'rbac.permission.granted',
  PERMISSION_DENIED = 'rbac.permission.denied',
  PERMISSION_CHECK = 'rbac.permission.check',
  ROLE_ASSIGNED = 'rbac.role.assigned',

  // Data access events
  DATA_READ = 'data.access.read',
  DATA_WRITE = 'data.access.write',
  DATA_DELETE = 'data.access.delete',

  // Security events
  SECURITY_BREACH = 'security.breach.detected',
  SUSPICIOUS_ACTIVITY = 'security.activity.suspicious',
  ACCESS_DENIED = 'security.access.denied',

  // System events
  SYSTEM_ERROR = 'system.error.occurred',
  SYSTEM_WARNING = 'system.warning.issued'
}
```

## Event Producer Interface

```typescript
// Standard event emitter interface
interface EventEmitter {
  // Basic event emission
  emit<T extends BaseEvent>(channel: string, event: T): Promise<void>;
  
  // Guaranteed delivery with options
  emitWithGuarantee<T extends BaseEvent>(
    channel: string, 
    event: T, 
    options?: EmitOptions
  ): Promise<void>;
}

// Emit options for guaranteed delivery
interface EmitOptions {
  priority?: 'high' | 'normal' | 'low';
  idempotencyKey?: string;
  deliveryDeadline?: Date;
  retryAttempts?: number;
}
```

## Event Consumer Interface

```typescript
// Standard event consumer interface
interface EventConsumer {
  // Subscribe to events with filtering
  subscribe<T extends BaseEvent>(
    channel: string, 
    handler: EventHandler<T>,
    options?: SubscribeOptions
  ): Subscription;
  
  // Unsubscribe from events
  unsubscribe(subscription: Subscription): void;
}

// Event handler function type
type EventHandler<T extends BaseEvent> = (event: T) => Promise<void>;

// Subscription options
interface SubscribeOptions {
  filter?: (event: BaseEvent) => boolean;
  batchSize?: number;
  maxConcurrency?: number;
  deadLetterQueue?: boolean;
}

// Subscription handle
interface Subscription {
  id: string;
  channel: string;
  isActive: boolean;
}
```

## Standard Event Channels

```typescript
// Predefined event channels
enum EventChannel {
  SECURITY = 'security',      // Security-related events
  RBAC = 'rbac',             // Permission and role events
  AUDIT = 'audit',           // Audit logging events
  SYSTEM = 'system',         // System lifecycle events
  TENANT = 'tenant',         // Multi-tenant events
  USER = 'user'              // User management events
}
```

## Event Creation Helper

```typescript
// Standard event creation utility
export function createEvent<T>(
  type: string,
  source: string,
  data: T,
  metadata?: EventMetadata
): DomainEvent<T> {
  return {
    id: crypto.randomUUID(),
    type,
    source,
    time: new Date().toISOString(),
    dataVersion: '1.0',
    data,
    metadata
  };
}

// Multi-tenant event creation
export function createTenantEvent<T>(
  type: string,
  source: string,
  data: T,
  tenantId: string,
  additionalMetadata?: Partial<EventMetadata>
): MultiTenantEvent<T> {
  return {
    id: crypto.randomUUID(),
    type,
    source,
    time: new Date().toISOString(),
    dataVersion: '1.0',
    data,
    metadata: {
      tenantId,
      ...additionalMetadata
    }
  };
}
```

## Event Validation Schema

```typescript
import { z } from 'zod';

// Base event validation schema
const BaseEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  source: z.string().min(1),
  time: z.string().datetime(),
  dataVersion: z.string().min(1),
  correlationId: z.string().optional()
});

// Event metadata validation
const EventMetadataSchema = z.object({
  userId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  ip: z.string().ip().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional()
}).passthrough(); // Allow additional fields

// Domain event validation
const DomainEventSchema = BaseEventSchema.extend({
  data: z.any(),
  metadata: EventMetadataSchema.optional()
});

// Validate event before emission
export function validateEvent(event: unknown): { isValid: boolean; error?: string } {
  try {
    DomainEventSchema.parse(event);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}
```

## Implementation Requirements

### All Event Implementations Must:
1. **Use standard schemas**: All events must extend BaseEvent
2. **Include tenant context**: Multi-tenant events must include tenantId
3. **Validate before emission**: Use validation schemas
4. **Handle errors gracefully**: Never let event emission break main flow
5. **Use structured logging**: Log event emission and consumption
6. **Implement idempotency**: Support duplicate event handling

### Performance Requirements:
- Event emission: < 10ms for normal priority
- Event processing: < 100ms for most handlers
- Channel capacity: Support 1000+ events/second
- Delivery guarantee: At-least-once delivery for guaranteed events

### Security Requirements:
- Sanitize PII in event data
- Validate tenant access for cross-tenant events
- Audit all event emissions
- Implement rate limiting per tenant

These patterns ensure consistency, performance, and security across all event-driven components in the system.
