# Security and Audit Logging Integration

> **Version**: 1.3.0  
> **Last Updated**: 2025-05-22

## Overview

This document details the integration between the Security system and the Audit Logging system, defining how authentication events, security configuration changes, and security-related activities are recorded. All event structures and flows follow the canonical event architecture defined in [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md).

## Integration Points

The Security system must notify the Audit Logging system of:

1. **Authentication Events**
   - Successful and failed logins
   - Password changes
   - MFA setup and verification
   - Session creation and termination

2. **Security Configuration Changes**
   - Security settings modifications
   - Token management operations
   - Security policy updates

3. **Security Actions**
   - User profile updates
   - Account lockouts/unlocks
   - Password resets
   - Suspicious activity detection

## Event Types and Structures

All events MUST follow the canonical event schema defined in [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md).

### Authentication Event Structure

```typescript
// Extends the standard BaseEvent interface from EVENT_ARCHITECTURE.md
interface AuthEvent extends BaseEvent {
  type: 'login' | 'logout' | 'passwordChange' | 'mfaSetup' | 'sessionCreate' | 'sessionTerminate';
  data: {
    userId: string;
    success: boolean;
    details?: Record<string, any>;
  };
  metadata: {
    ipAddress: string;
    userAgent: string;
    entityId?: string; // Entity context for multi-tenant events
    tenantId?: string; // Tenant ID for multi-tenant systems
  };
}
```

### Security Config Event Structure

```typescript
// Extends the standard BaseEvent interface from EVENT_ARCHITECTURE.md
interface SecurityConfigEvent extends BaseEvent {
  type: 'configChange' | 'policyUpdate' | 'tokenOperation';
  data: {
    setting?: string;
    oldValue?: any;
    newValue?: any;
    details?: Record<string, any>;
  };
  metadata: {
    userId: string;
    entityId?: string; // Entity context for multi-tenant events
    tenantId?: string; // Tenant ID for multi-tenant systems
  };
}
```

## Interface Definition

```typescript
// Security and Audit integration interface following EVENT_ARCHITECTURE.md patterns
interface SecurityAuditInterface {
  /**
   * Log authentication event
   */
  logAuthEvent(
    eventType: string,
    userId: string | null,
    success: boolean,
    details?: Record<string, any>,
    tenantId?: string // Optional tenant context
  ): Promise<void>;
  
  /**
   * Log security configuration change
   */
  logSecurityConfigChange(
    userId: string,
    setting: string,
    oldValue: any,
    newValue: any,
    details?: Record<string, any>,
    tenantId?: string // Optional tenant context
  ): Promise<void>;
  
  /**
   * Log security action
   */
  logSecurityAction(
    userId: string,
    action: string,
    target: string,
    success: boolean,
    details?: Record<string, any>,
    tenantId?: string // Optional tenant context
  ): Promise<void>;
}
```

## Implementation Requirements

```typescript
// Login function with audit logging using the canonical event architecture
async function login(
  email: string, 
  password: string, 
  ipAddress: string, 
  userAgent: string,
  tenantId?: string // Optional tenant context
): Promise<LoginResult> {
  try {
    // Verify credentials
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      // Log failed login attempt using standard event format
      await eventBus.emit('security', {
        id: generateUuid(),
        type: 'login',
        source: 'auth-service',
        time: new Date().toISOString(),
        dataVersion: '1.0',
        data: {
          userId: null,
          success: false,
          reason: 'User not found'
        },
        metadata: {
          email,
          ipAddress,
          userAgent,
          tenantId
        }
      });
      
      throw new Error('Invalid credentials');
    }
    
    // Check password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    
    if (!passwordValid) {
      // Log failed login attempt using standard event format
      await eventBus.emit('security', {
        id: generateUuid(),
        type: 'login',
        source: 'auth-service',
        time: new Date().toISOString(),
        dataVersion: '1.0',
        data: {
          userId: user.id,
          success: false,
          reason: 'Invalid password'
        },
        metadata: {
          ipAddress,
          userAgent,
          entityId: user.entityId,
          tenantId
        }
      });
      
      throw new Error('Invalid credentials');
    }
    
    // Create session
    const session = await sessionManager.createSession(user.id, ipAddress, userAgent);
    
    // Log successful login using standard event format
    await eventBus.emit('security', {
      id: generateUuid(),
      type: 'login',
      source: 'auth-service',
      time: new Date().toISOString(),
      dataVersion: '1.0',
      data: {
        userId: user.id,
        success: true
      },
      metadata: {
        ipAddress,
        userAgent,
        sessionId: session.id,
        entityId: user.entityId,
        tenantId
      }
    });
    
    return {
      user,
      session,
      token: generateToken(user, session)
    };
  } catch (error) {
    // Log unexpected errors using standard event format
    if (email) {
      await eventBus.emit('security', {
        id: generateUuid(),
        type: 'login',
        source: 'auth-service',
        time: new Date().toISOString(),
        dataVersion: '1.0',
        data: {
          userId: null,
          success: false,
          error: error.message
        },
        metadata: {
          email,
          ipAddress,
          userAgent,
          tenantId
        }
      });
    }
    
    throw error;
  }
}
```

```typescript
// Update security settings with audit logging using canonical event structure
async function updateSecuritySettings(
  userId: string,
  entityId: string,
  tenantId: string,
  settings: SecuritySettings
): Promise<void> {
  // Get current settings for comparison
  const currentSettings = await securityRepository.getSettings(entityId, tenantId);
  
  // Update each setting
  for (const [key, newValue] of Object.entries(settings)) {
    const oldValue = currentSettings[key];
    
    // Skip if unchanged
    if (oldValue === newValue) continue;
    
    // Update setting
    await securityRepository.updateSetting(key, newValue, entityId, tenantId);
    
    // Log the change using standard event format
    await eventBus.emit('security', {
      id: generateUuid(),
      type: 'configChange',
      source: 'security-settings-service',
      time: new Date().toISOString(),
      dataVersion: '1.0',
      data: {
        setting: key,
        oldValue,
        newValue
      },
      metadata: { 
        userId,
        entityId,
        tenantId,
        source: 'admin-panel'
      }
    });
  }
}
```

## Error Handling Integration

Security events and errors must be integrated according to the standards in [../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md):

1. **Error to Event Mapping**
   - Security errors must generate corresponding audit events
   - Error severity must map to appropriate event priorities
   - Error correlation IDs (traceId) must be preserved in audit events

2. **Standardized Error Logging**
   - Security errors must follow the standardized format
   - Error events must include all required security context
   - Error patterns must generate appropriate security alerts

```typescript
// Example of error-to-audit event mapping
function mapSecurityErrorToAuditEvent(error: SecurityError): AuditEvent {
  return {
    id: generateUuid(),
    type: 'security.error',
    source: error.source || 'security-system',
    time: new Date().toISOString(),
    dataVersion: '1.0',
    data: {
      errorCode: error.code,
      classification: error.classification,
      message: error.message
    },
    metadata: {
      userId: error.userId,
      ipAddress: error.ipAddress,
      userAgent: error.userAgent,
      traceId: error.traceId,
      entityId: error.entityId,
      tenantId: error.tenantId
    }
  };
}
```

## Multi-Tenant Considerations

Security events in a multi-tenant environment must adhere to these additional requirements:

1. **Tenant Context**
   - All security events must include tenant context (tenantId) when applicable
   - Cross-tenant operations must be explicitly identified in events
   - Tenant-specific security settings must be isolated

2. **Cross-Tenant Security Operations**
   - Explicit permissions are required for cross-tenant operations
   - Cross-tenant security events require additional audit detail
   - Follow entity boundary enforcement from [../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)

```typescript
// Cross-tenant security operation with proper audit logging
async function crossTenantSecurityOperation(
  userId: string,
  sourceTenantId: string,
  targetTenantId: string,
  operation: string,
  details: Record<string, any>
): Promise<void> {
  // Verify cross-tenant permission
  if (!await hasPermission(userId, 'CrossTenantOperations', sourceTenantId)) {
    throw new Error('Permission denied for cross-tenant operation');
  }
  
  // Perform operation
  await securityOperationService.execute(operation, targetTenantId, details);
  
  // Log cross-tenant security operation using standard event format
  await eventBus.emit('security', {
    id: generateUuid(),
    type: 'crossTenantOperation',
    source: 'security-admin-service',
    time: new Date().toISOString(),
    dataVersion: '1.0',
    data: {
      operation,
      details
    },
    metadata: {
      userId,
      crossTenant: true,
      sourceTenantId,
      targetTenantId
    }
  });
}
```

## Entity Boundary Enforcement

Security-related events and access to security logs must respect the entity boundaries defined in [../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md):

- All security events MUST include entity context when available
- Entity boundary checks MUST follow the canonical algorithm from ENTITY_BOUNDARIES.md
- Permission checks for security log access MUST validate entity context

```typescript
// Entity boundary validation using canonical algorithm from ENTITY_BOUNDARIES.md
function validateSecurityLogAccess(user, entityId, tenantId) {
  // Use the canonical validation algorithm
  return validatePermissionGrant(
    user, 
    'ViewSecurityLogs', 
    { entityId, tenantId }
  );
}
```

## Audit Requirements

Security-related events must be logged with:

1. **Comprehensive Context**
   - All authentication attempts, successful or failed
   - Security policy changes with before/after values
   - Security action attempts with results
   - Location information (IP, device) when available
   - Entity context for multi-tenant environments
   - Tenant context for multi-tenant systems

2. **Alert Integration**
   - Critical security events must trigger alerts
   - Anomalous patterns must be detected
   - Suspicious activity must be highlighted

3. **Compliance Support**
   - Authentication records must be preserved for compliance
   - Security setting changes must be traceable
   - Audit reports must include security events

## Related Documentation

- **[EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md)**: Canonical event architecture definition
- **[../security/AUTH_SYSTEM.md](../security/AUTH_SYSTEM.md)**: Authentication system details
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Standardized error handling
- **[../audit/LOGGING_SERVICE.md](../audit/LOGGING_SERVICE.md)**: Audit logging service
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: Audit system's security integration
- **[../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)**: Canonical entity boundary implementation
- **[SECURITY_RBAC_INTEGRATION.md](SECURITY_RBAC_INTEGRATION.md)**: Security and RBAC integration
- **[../multitenancy/DATA_ISOLATION.md](../multitenancy/DATA_ISOLATION.md)**: Multi-tenant data isolation

## Version History

- **1.3.0**: Added Error Handling Integration section referencing ERROR_HANDLING.md (2025-05-22)
- **1.2.0**: Added comprehensive multi-tenant considerations and aligned with updated event architecture (2025-05-22)
- **1.1.0**: Updated to align with canonical event architecture (2025-05-22)
- **1.0.0**: Initial Security and Audit integration specification
