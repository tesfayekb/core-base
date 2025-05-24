
# Event Architecture Implementation Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This guide provides implementation details for the event architecture patterns defined in [EVENT_CORE_PATTERNS.md](EVENT_CORE_PATTERNS.md).

## Event Bus Configuration

```typescript
const eventBusConfig = {
  channels: {
    'security': {
      bufferSize: 1000,
      consumers: ['audit-logger', 'metrics-service', 'alert-service'],
      retryStrategy: {
        attempts: 3,
        backoff: 'exponential',
        initialDelay: 100, // ms
        maxDelay: 5000 // ms
      }
    },
    'rbac': {
      bufferSize: 500,
      consumers: ['audit-logger', 'permission-cache-invalidator'],
      retryStrategy: {
        attempts: 2,
        backoff: 'fixed',
        delay: 200 // ms
      }
    },
    'audit': {
      bufferSize: 2000,
      consumers: ['audit-storage-service', 'audit-dashboard-realtime'],
      retryStrategy: {
        attempts: 5,
        backoff: 'exponential',
        initialDelay: 100, // ms
        maxDelay: 10000 // ms
      }
    }
  },
  defaultConsumer: 'audit-logger'
};
```

## Event Bus Implementation

```typescript
class EventBusService implements EventEmitter, EventConsumer {
  private channels: Map<string, Channel>;
  private config: EventBusConfig;
  
  constructor(config: EventBusConfig) {
    this.config = config;
    this.channels = new Map();
    
    // Initialize channels from config
    Object.entries(config.channels).forEach(([name, channelConfig]) => {
      this.channels.set(name, new Channel(name, channelConfig));
    });
  }
  
  async emit<T extends BaseEvent>(channel: string, event: T): Promise<void> {
    const targetChannel = this.getOrCreateChannel(channel);
    await targetChannel.publish(event);
  }
  
  async emitWithGuarantee<T extends BaseEvent>(
    channel: string, 
    event: T, 
    options?: EmitOptions
  ): Promise<void> {
    const targetChannel = this.getOrCreateChannel(channel);
    await targetChannel.publishWithGuarantee(event, options);
  }
  
  subscribe<T extends BaseEvent>(
    channel: string,
    handler: (event: T) => Promise<void>,
    options?: SubscribeOptions
  ): Subscription {
    const targetChannel = this.getOrCreateChannel(channel);
    return targetChannel.subscribe(handler, options);
  }
  
  unsubscribe(subscription: Subscription): void {
    const channel = this.channels.get(subscription.channel);
    if (channel) {
      channel.unsubscribe(subscription);
    }
  }
  
  private getOrCreateChannel(name: string): Channel {
    if (!this.channels.has(name)) {
      const config = this.config.channels[name] || 
                    { bufferSize: 100, consumers: [] };
      this.channels.set(name, new Channel(name, config));
    }
    return this.channels.get(name)!;
  }
}
```

## Resilience Patterns

1. **Retry Mechanism**: Failed event deliveries are retried based on configured strategy
2. **Circuit Breakers**: Failing consumers are isolated to prevent cascade failures  
3. **Back Pressure Handling**: Buffer limits prevent memory exhaustion

## Tenant-Aware Event Producer

```typescript
class TenantAwareEventProducer {
  private eventBus: EventEmitter;
  private tenantContextService: TenantContextService;
  
  constructor(eventBus: EventEmitter, tenantContextService: TenantContextService) {
    this.eventBus = eventBus;
    this.tenantContextService = tenantContextService;
  }
  
  async emitEvent<T>(channel: string, eventType: string, data: T): Promise<void> {
    const tenantId = this.tenantContextService.getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context available');
    }
    
    await this.eventBus.emit(channel, {
      id: generateUuid(),
      type: eventType,
      source: 'tenant-aware-producer',
      time: new Date().toISOString(),
      dataVersion: '1.0',
      data,
      metadata: {
        tenantId,
        user: getCurrentUserId()
      }
    });
  }
}
```

## Related Documentation

- [Event Core Patterns](EVENT_CORE_PATTERNS.md): Core event patterns and schemas
- [Event Examples](EVENT_EXAMPLES.md): Implementation examples
- [SECURITY_RBAC_INTEGRATION.md](SECURITY_RBAC_INTEGRATION.md): Security and RBAC integration
- [RBAC_AUDIT_INTEGRATION.md](RBAC_AUDIT_INTEGRATION.md): RBAC and Audit integration

## Version History

- **1.0.0**: Extracted implementation details from EVENT_ARCHITECTURE.md (2025-05-23)
