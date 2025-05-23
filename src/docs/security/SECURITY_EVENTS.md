
# Security Event Logging

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the security event logging system that captures, processes, and stores security-related events for auditing and compliance.

## Event Categories

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

## Security Event Schema

Security events follow this standardized format:

```typescript
interface SecurityEvent {
  // Event identification
  id?: string;                  // Auto-generated if not provided
  timestamp?: string;           // ISO 8601 format, defaults to now
  
  // Event categorization
  type: SecurityEventType;      // Primary event category
  subtype: string;              // Event-specific subtype
  level: SecurityEventLevel;    // Severity/importance level
  
  // User context
  userId?: string;              // User that triggered the event
  sessionId?: string;           // User session ID
  
  // System context
  source: string;               // System component that generated the event
  tenantId?: string;            // Multi-tenant context
  environment: string;          // Production, staging, development
  
  // Request context
  requestId?: string;           // Correlation ID for tracking
  ip?: string;                  // IP address
  userAgent?: string;           // User agent
  
  // Event details
  metadata: Record<string, any>; // Event-specific data
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

## Event Logging Implementation

The security event logging implementation:

```typescript
// Security event logging implementation
async function auditSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // 1. Validate event structure
    validateSecurityEvent(event);
    
    // 2. Add standard fields if not provided
    const enrichedEvent = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      environment: getEnvironment(),
      source: getServiceName(),
      ...event
    };
    
    // 3. Determine priority based on event type and level
    const priority = calculateEventPriority(enrichedEvent);
    
    // 4. Submit to audit logging service with appropriate priority
    if (priority === 'high') {
      // High priority - log immediately and wait for confirmation
      await auditLogger.logImmediately(enrichedEvent);
    } else {
      // Standard priority - can be batched
      auditLogger.log(enrichedEvent);
    }
    
    // 5. Trigger alerts for critical events
    if (enrichedEvent.level === SecurityEventLevel.CRITICAL) {
      await securityAlertService.trigger(enrichedEvent);
    }
  } catch (error) {
    // Fallback logging to ensure security events are never lost
    console.error('Failed to audit security event:', error);
    
    // Last resort - local file logging if available
    try {
      await fallbackLogger.log(event);
    } catch (fallbackError) {
      console.error('Fallback security logging failed:', fallbackError);
    }
  }
}

// Utility to calculate event priority
function calculateEventPriority(event: SecurityEvent): 'high' | 'standard' {
  // Critical and error events are always high priority
  if (
    event.level === SecurityEventLevel.CRITICAL || 
    event.level === SecurityEventLevel.ERROR
  ) {
    return 'high';
  }
  
  // Authentication failures are high priority
  if (
    event.type === SecurityEventType.AUTHENTICATION && 
    event.subtype?.includes('failure')
  ) {
    return 'high';
  }
  
  // Configuration changes are high priority
  if (event.type === SecurityEventType.CONFIGURATION) {
    return 'high';
  }
  
  // Admin actions are high priority
  if (event.type === SecurityEventType.ADMIN_ACTION) {
    return 'high';
  }
  
  // Default to standard priority
  return 'standard';
}
```

## Event Types and Subtypes

Security events are categorized by these types and subtypes:

### Authentication Events

```typescript
// Authentication event examples
interface AuthenticationEvent extends SecurityEvent {
  type: 'authentication';
  subtype: 
    | 'login_success' 
    | 'login_failure' 
    | 'logout' 
    | 'token_refresh'
    | 'password_reset_request'
    | 'password_changed'
    | 'mfa_enabled'
    | 'mfa_disabled'
    | 'mfa_challenge'
    | 'mfa_success'
    | 'mfa_failure';
  metadata: {
    method?: 'password' | 'social' | 'sso' | 'token';
    provider?: string;
    reason?: string;
    attemptCount?: number;
  }
}
```

### Authorization Events

```typescript
// Authorization event examples
interface AuthorizationEvent extends SecurityEvent {
  type: 'authorization';
  subtype: 
    | 'permission_check'
    | 'permission_granted'
    | 'permission_denied'
    | 'role_assigned'
    | 'role_revoked'
    | 'permission_created'
    | 'permission_deleted';
  metadata: {
    resource?: string;
    action?: string;
    roleId?: string;
    roleName?: string;
    permissionId?: string;
    targetUserId?: string;
  }
}
```

### Configuration Events

```typescript
// Configuration event examples
interface ConfigurationEvent extends SecurityEvent {
  type: 'configuration';
  subtype: 
    | 'security_setting_changed'
    | 'feature_flag_changed'
    | 'integration_configured'
    | 'policy_updated'
    | 'system_setting_changed';
  metadata: {
    setting?: string;
    oldValue?: any;
    newValue?: any;
    component?: string;
    reason?: string;
    approvedBy?: string;
  }
}
```

## Related Documentation

- **[OVERVIEW.md](OVERVIEW.md)**: Security implementation overview
- **[AUTH_ALGORITHMS.md](AUTH_ALGORITHMS.md)**: Authentication algorithms
- **[PERMISSION_ENFORCEMENT.md](PERMISSION_ENFORCEMENT.md)**: Permission enforcement
- **[SECURITY_MONITORING.md](SECURITY_MONITORING.md)**: Security monitoring
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: Audit integration

## Version History

- **1.0.0**: Initial document created from OVERVIEW.md refactoring (2025-05-23)
