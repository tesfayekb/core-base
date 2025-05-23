
# RBAC and Audit Logging Integration

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document details the integration between the Role-Based Access Control (RBAC) system and the Audit Logging system, defining how permission changes and access attempts are recorded.

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

## Event Publishing Interface

```typescript
interface RbacEventPublishingInterface {
  /**
   * Log permission check result
   */
  logPermissionCheck(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    context?: Record<string, any>
  ): void;
  
  /**
   * Log role assignment change
   */
  logRoleChange(
    targetUserId: string,
    changedBy: string,
    changeType: 'assigned' | 'removed',
    roleId: string,
    context?: Record<string, any>
  ): void;
  
  /**
   * Log permission configuration change
   */
  logPermissionChange(
    changedBy: string,
    changeType: 'created' | 'updated' | 'deleted' | 'assigned' | 'revoked',
    roleId?: string,
    permissionId?: string,
    details?: Record<string, any>
  ): void;
}
```

## Implementation Requirements

### Permission Check Logging

```typescript
// Permission check with automatic audit logging
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
  
  // Log permission check to audit system
  auditLogger.logPermissionCheck(
    userId,
    resource,
    action,
    hasPermission,
    { resourceId }
  );
  
  return hasPermission;
}
```

### Role Change Logging

```typescript
// Role assignment with automatic audit logging
async function assignRoleToUser(
  userId: string,
  roleId: string,
  assignedBy: string
): Promise<void> {
  // Perform role assignment
  await roleManager.assignRole(userId, roleId);
  
  // Log role assignment to audit system
  auditLogger.logRoleChange(
    userId,
    assignedBy,
    'assigned',
    roleId
  );
  
  // Invalidate permission cache for user
  permissionCache.invalidate(userId);
}
```

## Event Structures

### Permission Event Structure

```typescript
interface PermissionEvent {
  eventType: 'permissionCheck' | 'roleAssign' | 'roleRemove' | 'permissionChange';
  userId: string;
  targetId?: string;
  resource?: string;
  action?: string;
  granted?: boolean;
  roleId?: string;
  permissionId?: string;
  timestamp: string;
  context?: Record<string, any>;
}
```

### Access Log Structure

```typescript
interface AccessLogEvent {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  result: 'granted' | 'denied';
  timestamp: string;
  location: {
    ip?: string;
    userAgent?: string;
  };
  details?: Record<string, any>;
}
```

## Audit Trail Requirements

Permission-related events must be logged with:

1. **Complete Context**
   - Who performed the action (userId)
   - What action was performed (operation)
   - Which resource was affected (resource, resourceId)
   - When it occurred (timestamp)
   - Where it originated from (IP, user agent)
   - Why it was performed (context)

2. **Search and Filtering**
   - Events must be indexed for efficient searching
   - Filtering by user, resource, action, and result must be supported
   - Time-based filtering must be available

3. **Compliance Support**
   - Role and permission changes must be preserved for compliance requirements
   - Access grant/deny patterns must be analyzable for security reviews
   - Reports must be generatable for audit purposes

## Related Documentation

- **[../rbac/PERMISSION_RESOLUTION.md](../rbac/PERMISSION_RESOLUTION.md)**: Permission resolution process
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: Audit security integration
- **[EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md)**: Event architecture details
- **[SECURITY_AUDIT_INTEGRATION.md](SECURITY_AUDIT_INTEGRATION.md)**: Security audit integration

## Version History

- **1.0.0**: Initial RBAC and Audit integration specification
