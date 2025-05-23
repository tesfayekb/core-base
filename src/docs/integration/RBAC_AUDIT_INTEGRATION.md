
# RBAC and Audit Logging Integration

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the integration between the Role-Based Access Control (RBAC) system and the Audit Logging system, defining how permission changes and access attempts are recorded.

## Canonical Event Architecture Reference

**IMPORTANT**: All RBAC event integration follows the patterns defined in [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md). This document provides RBAC-specific implementations that extend the canonical event architecture.

## Integration Points

The RBAC system must emit events to the Audit Logging system for:

1. **Permission Changes**
   - Role creation/modification/deletion
   - Permission assignment/removal
   - Role assignment to users

2. **Permission Check Results**
   - Access granted events
   - Access denied events
   - Resource access attempts

3. **Administrative Actions**
   - Permission system configuration changes
   - Role boundary changes
   - Role structure modifications

## RBAC Event Production Interface

RBAC events extend the canonical EventEmitter interface from [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md):

```typescript
// RBAC event producer following canonical patterns
interface RbacEventProducer {
  /**
   * Log permission check result using canonical event schema
   */
  logPermissionCheck(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    context?: Record<string, any>
  ): Promise<void>;
  
  /**
   * Log role assignment change using canonical event schema
   */
  logRoleChange(
    targetUserId: string,
    changedBy: string,
    changeType: 'assigned' | 'removed',
    roleId: string,
    context?: Record<string, any>
  ): Promise<void>;
  
  /**
   * Log permission configuration change using canonical event schema
   */
  logPermissionChange(
    changedBy: string,
    changeType: 'created' | 'updated' | 'deleted' | 'assigned' | 'revoked',
    roleId?: string,
    permissionId?: string,
    details?: Record<string, any>
  ): Promise<void>;
}
```

## Implementation Using Canonical Event Architecture

### Permission Check Logging

```typescript
// Permission check with automatic audit logging using canonical events
class RbacEventProducerImpl implements RbacEventProducer {
  private eventBus: EventEmitter;
  
  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
  }
  
  async logPermissionCheck(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    context?: Record<string, any>
  ): Promise<void> {
    const rbacEvent: DomainEvent<PermissionCheckData> = {
      id: generateUUID(),
      type: 'rbac.permission_check',
      source: 'rbac-service',
      time: new Date().toISOString(),
      dataVersion: '1.0',
      data: {
        userId,
        resource,
        action,
        granted,
        context
      },
      metadata: {
        tenantId: getCurrentTenantId(),
        correlationId: getRequestCorrelationId()
      }
    };
    
    // Use canonical event bus
    await this.eventBus.emit('rbac', rbacEvent);
  }
  
  async logRoleChange(
    targetUserId: string,
    changedBy: string,
    changeType: 'assigned' | 'removed',
    roleId: string,
    context?: Record<string, any>
  ): Promise<void> {
    const rbacEvent: DomainEvent<RoleChangeData> = {
      id: generateUUID(),
      type: 'rbac.role_change',
      source: 'rbac-service',
      time: new Date().toISOString(),
      dataVersion: '1.0',
      data: {
        targetUserId,
        changedBy,
        changeType,
        roleId,
        context
      },
      metadata: {
        tenantId: getCurrentTenantId(),
        correlationId: getRequestCorrelationId()
      }
    };
    
    // High priority for role changes
    await this.eventBus.emitWithGuarantee('rbac', rbacEvent, {
      priority: 'high'
    });
  }
}

// Event data interfaces extending canonical schema
interface PermissionCheckData {
  userId: string;
  resource: string;
  action: string;
  granted: boolean;
  context?: Record<string, any>;
}

interface RoleChangeData {
  targetUserId: string;
  changedBy: string;
  changeType: 'assigned' | 'removed';
  roleId: string;
  context?: Record<string, any>;
}
```

### Integrated Permission System with Canonical Events

```typescript
// Permission check with automatic audit logging using canonical event architecture
async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  resourceId?: string
): Promise<boolean> {
  // Perform actual permission check
  const hasPermission = await permissionResolver.resolvePermission(
    userId, resource, action, resourceId
  );
  
  // Log permission check using canonical event system
  await rbacEventProducer.logPermissionCheck(
    userId,
    resource,
    action,
    hasPermission,
    { resourceId }
  );
  
  return hasPermission;
}

// Role assignment with automatic audit logging using canonical events
async function assignRoleToUser(
  userId: string,
  roleId: string,
  assignedBy: string
): Promise<void> {
  // Perform role assignment
  await roleManager.assignRole(userId, roleId);
  
  // Log role assignment using canonical event system
  await rbacEventProducer.logRoleChange(
    userId,
    assignedBy,
    'assigned',
    roleId
  );
  
  // Invalidate permission cache for user
  permissionCache.invalidate(userId);
}
```

## Event Channel Configuration

RBAC events use the 'rbac' channel as defined in the canonical event bus configuration from [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md):

```typescript
// RBAC channel configuration (from canonical event architecture)
'rbac': {
  bufferSize: 500,
  consumers: ['audit-logger', 'permission-cache-invalidator'],
  retryStrategy: {
    attempts: 2,
    backoff: 'fixed',
    delay: 200 // ms
  }
}
```

## Audit Trail Requirements

Permission-related events must be logged following the canonical event schema with:

1. **Complete Context** (as defined in canonical event metadata)
2. **Search and Filtering** (supported by canonical event structure)
3. **Compliance Support** (enabled by canonical event immutability)

## Related Documentation

- **[EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md)**: **CANONICAL EVENT ARCHITECTURE REFERENCE**
- **[../rbac/PERMISSION_RESOLUTION.md](../rbac/PERMISSION_RESOLUTION.md)**: Permission resolution process
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: Audit security integration
- **[SECURITY_AUDIT_INTEGRATION.md](SECURITY_AUDIT_INTEGRATION.md)**: Security audit integration

## Version History

- **2.0.0**: Refactored to use canonical event architecture from EVENT_ARCHITECTURE.md, removed duplicate event patterns (2025-05-23)
- **1.0.0**: Initial RBAC and Audit integration specification
