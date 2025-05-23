
# Security Error Handling Standards

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines standardized error handling approaches for all security-critical components in the system. Consistent error handling is crucial for preventing security gaps, improving system reliability, and ensuring proper audit trails of security-related events.

## Core Error Handling Principles

### 1. Security Error Classification

All security-related errors must be classified according to their severity and security impact:

| Classification | Description | Example |
|---------------|-------------|---------|
| **Critical**  | Immediate security threat | Authentication bypass attempt, injection attack |
| **Major**     | Significant security concern | Multiple failed login attempts, abnormal permission elevation |
| **Minor**     | Potential security issue | Invalid input format, expired session |
| **Informational** | Security-relevant but not threatening | User role change, permission query timeout |

### 2. Standardized Error Response Structure

All security components must return errors using this standard structure:

```typescript
interface SecurityErrorResponse {
  error: {
    code: string;         // Machine-readable error code
    message: string;      // User-facing message (sanitized)
    classification: string; // Security classification
    traceId: string;      // Unique ID for correlation
    timestamp: string;    // ISO 8601 timestamp
    details?: {           // Optional detailed information
      context?: string;   // Additional context (sanitized)
      suggestion?: string; // Suggested remediation
    };
  }
}
```

### 3. Error Logging Requirements

All security errors must be logged with the following information:

- Full error details (including technical details not exposed to users)
- User identity (if available)
- Session information
- Request context (endpoint, operation)
- IP address and user agent
- Timestamp with millisecond precision
- Correlation ID that matches the error response traceId

## Error Handling Implementation Patterns

### 1. Authentication Errors

Authentication errors must follow these handling patterns:

```typescript
try {
  // Authentication logic
} catch (error) {
  // 1. Log the detailed error with security context
  logger.security(`Authentication failure: ${error.message}`, {
    userId: attemptedUserId,
    ipAddress,
    userAgent,
    details: error
  });
  
  // 2. Return standardized error response
  return {
    error: {
      code: 'AUTH_ERROR',
      message: 'Authentication failed', // Generic message only
      classification: 'Minor', // Elevated if multiple failures
      traceId: generateTraceId(),
      timestamp: new Date().toISOString()
    }
  };
}
```

Critical security principle: Authentication errors must never reveal whether a username exists in the system.

### 2. Authorization Errors

Authorization (permission) errors must follow these handling patterns:

```typescript
try {
  // Permission check logic
} catch (error) {
  // 1. Log the detailed error with permission context
  logger.security(`Permission check failure: ${error.message}`, {
    userId,
    resource,
    action,
    details: error
  });
  
  // 2. Return standardized error response
  return {
    error: {
      code: 'PERMISSION_DENIED',
      message: 'Permission denied for requested operation',
      classification: 'Minor',
      traceId: generateTraceId(),
      timestamp: new Date().toISOString()
    }
  };
}
```

### 3. Input Validation Errors

Security-sensitive input validation must follow these patterns:

```typescript
// Validate with detailed error collection
const validationResult = validateSecurityInput(input);

if (!validationResult.valid) {
  // 1. Log the validation failures
  logger.security('Security validation failure', {
    userId,
    inputType,
    failures: validationResult.errors
  });
  
  // 2. Return standardized error with sanitized details
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      classification: 'Minor',
      traceId: generateTraceId(),
      timestamp: new Date().toISOString(),
      details: {
        // Only return field names with generic messages, never echo input
        fields: validationResult.errors.map(e => ({
          field: e.field,
          message: 'Invalid format'
        }))
      }
    }
  };
}
```

## Error Event Handling

### 1. Security Event Triggers

Specific error patterns must trigger security events:

| Error Pattern | Trigger Condition | Event Action |
|---------------|-------------------|--------------|
| Authentication | 3+ failures for same user within 5 minutes | Account lockout consideration |
| Authorization | 5+ permission denials for same user within 10 minutes | Security alert, possible attack |
| Validation | Potentially malicious input detected | IP monitoring, possible rate limiting |

### 2. Error Aggregation and Analysis

Security errors must be aggregated and analyzed for patterns:

```typescript
// Example error aggregation function
async function checkErrorPattern(
  userId: string, 
  errorType: string,
  timeWindowMinutes: number = 5
): Promise<boolean> {
  const recentErrors = await securityErrorRepository.countRecentErrors({
    userId,
    errorType,
    since: new Date(Date.now() - timeWindowMinutes * 60 * 1000)
  });
  
  return recentErrors >= getThresholdForErrorType(errorType);
}
```

## Integration with Audit System

All security errors must be integrated with the audit system as defined in [../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md):

1. Security errors must generate audit events
2. Critical and major errors must create high-priority audit entries
3. Error patterns must trigger security alerts in the audit dashboard
4. All errors must be searchable in the audit system

## Framework-Specific Implementation

### API Error Handling

All API endpoints must implement error handling following the BaseApiController pattern:

```typescript
// Example from BaseApiController
protected handleSecurityError(error: Error, userId?: string): ApiResponse<null> {
  // 1. Classify the error
  const classification = classifySecurityError(error);
  
  // 2. Log based on classification
  if (classification === 'Critical' || classification === 'Major') {
    logger.security(`Security error: ${error.message}`, {
      userId,
      classification,
      error
    });
  } else {
    logger.error(`Security error: ${error.message}`, {
      userId,
      classification,
      error
    });
  }
  
  // 3. Generate standardized response
  const traceId = generateTraceId();
  
  return {
    data: null,
    error: {
      code: mapErrorToCode(error),
      message: getSanitizedErrorMessage(error),
      classification,
      traceId,
      timestamp: new Date().toISOString()
    },
    meta: {
      traceId
    }
  };
}
```

### Database Error Handling

Security-related database errors must be handled consistently:

```typescript
try {
  // Database operation
} catch (dbError) {
  // 1. Translate database-specific errors
  const securityError = translateDatabaseError(dbError);
  
  // 2. Log appropriately
  logger.security(`Database security error: ${securityError.message}`, {
    userId,
    operation,
    originalError: dbError
  });
  
  // 3. Return standardized error
  throw new SecurityError(securityError.code, securityError.message);
}
```

## Error Handling in Multi-Tenant Context

Additional requirements for multi-tenant environments:

1. Tenant context must be included in all error logs
2. Error responses must never leak information across tenant boundaries
3. Error handling must respect entity boundaries as defined in [../rbac/ENTITY_BOUNDARIES.md](../rbac/ENTITY_BOUNDARIES.md)

## Testing Security Error Handling

Error handling in security-critical components must be rigorously tested:

1. Unit tests must verify correct error classification
2. Integration tests must verify proper audit trail creation
3. Security tests must verify no sensitive information leakage in error responses
4. Load tests must verify error handling under high volume conditions

## Relation to Permission Query Performance

Error handling for permission queries must be optimized as detailed in [../rbac/PERMISSION_QUERY_OPTIMIZATION.md](../rbac/PERMISSION_QUERY_OPTIMIZATION.md) to ensure:

1. Fast failure responses for permission checks
2. Proper handling of query timeouts
3. Graceful degradation under load
4. Appropriate caching of negative results

## Related Documentation

- **[../integration/SECURITY_AUDIT_INTEGRATION.md](../integration/SECURITY_AUDIT_INTEGRATION.md)**: Security and audit integration
- **[../rbac/PERMISSION_RESOLUTION.md](../rbac/PERMISSION_RESOLUTION.md)**: Permission resolution process
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: Audit system's security integration
- **[../security/AUTH_SYSTEM.md](../security/AUTH_SYSTEM.md)**: Authentication system
- **[../rbac/PERMISSION_QUERY_OPTIMIZATION.md](../rbac/PERMISSION_QUERY_OPTIMIZATION.md)**: Permission query optimization

## Version History

- **1.0.0**: Initial error handling standardization document (2025-05-22)
