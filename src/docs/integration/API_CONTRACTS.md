
# API Contracts Between Components

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-22

## Overview

This document defines the API contracts between system components, providing the interface definitions, data structures, and interaction patterns that enable components to communicate with each other.

## Security to RBAC API Contracts

### Authentication Result Structure

```typescript
interface AuthenticationResult {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: Role[];
    permissions?: Permission[];
  };
  session?: {
    id: string;
    expiresAt: string;
  };
  token?: string;
  mfaRequired?: boolean;
}
```

### Permission Check Request Structure

```typescript
interface PermissionCheckRequest {
  userId: string;
  resource: string;
  action: string;
  resourceId?: string;
  context?: Record<string, any>;
}
```

### Permission Check Response Structure

```typescript
interface PermissionCheckResponse {
  granted: boolean;
  reason?: string;
  grantedBy?: {
    roleId: string;
    roleName: string;
  };
}
```

## RBAC to Audit API Contracts

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

## Security to Audit API Contracts

### Security Event Structure

```typescript
interface SecurityEvent {
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  targetId?: string;
  timestamp: string;
  location: {
    ip?: string;
    userAgent?: string;
  };
  details: Record<string, any>;
}
```

### Authentication Event Structure

```typescript
interface AuthEvent {
  eventType: 'login' | 'logout' | 'passwordChange' | 'mfaSetup' | 'sessionCreate' | 'sessionTerminate';
  userId: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  details?: Record<string, any>;
}
```

### Security Config Event Structure

```typescript
interface SecurityConfigEvent {
  eventType: 'configChange' | 'policyUpdate' | 'tokenOperation';
  userId: string;
  setting?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
  details?: Record<string, any>;
}
```

## Common Data Structures

### Role Structure

```typescript
interface Role {
  id: string;
  name: string;
  description?: string;
  scope?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isSystem?: boolean;
  metadata?: Record<string, any>;
}
```

### Permission Structure

```typescript
interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  constraints?: Record<string, any>;
  isSystem?: boolean;
  metadata?: Record<string, any>;
}
```

### User Identity Structure

```typescript
interface UserIdentity {
  id: string;
  email?: string;
  name?: string;
  roles: string[];
  metadata?: Record<string, any>;
}
```

### Error Response Structure

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    classification?: string;  // Security classification (Critical, Major, Minor, Informational)
    traceId?: string;        // Correlation ID for tracking
    target?: string;
    details?: Array<{
      code: string;
      message: string;
      target?: string;
    }>;
    innerError?: {
      code: string;
      message: string;
    };
  };
}
```

For security-critical errors, the response must follow the full structure defined in [../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md).

## API Versioning Strategy

All component APIs follow semantic versioning:

1. **Major Version Changes** 
   - Breaking changes to the API contract
   - Accessed via path versioning (/v1/, /v2/)
   - Previous major versions supported for 6 months
   
2. **Minor Version Changes**
   - Backward-compatible additions
   - Accessed via query parameter (?version=1.1)
   - Default is latest minor version
   
3. **Patch Version Changes**
   - Bug fixes and implementation improvements
   - No API contract changes
   - Transparent to consumers

## Content Negotiation

APIs support content negotiation through:

1. **Accept Header**
   - Format selection (JSON, XML)
   - Version specification
   - Example: `Accept: application/json; version=1.1`
   
2. **Content-Type Header**
   - Request payload format
   - Example: `Content-Type: application/json`

## Status Code Usage

APIs use standard HTTP status codes:

- **2xx** - Successful operations
  - 200: OK (standard success)
  - 201: Created (resource creation)
  - 204: No Content (successful operation with no response body)
  
- **4xx** - Client errors
  - 400: Bad Request (invalid input)
  - 401: Unauthorized (authentication required)
  - 403: Forbidden (permission denied)
  - 404: Not Found (resource does not exist)
  - 409: Conflict (resource state conflict)
  - 422: Unprocessable Entity (validation error)
  
- **5xx** - Server errors
  - 500: Internal Server Error (unexpected error)
  - 503: Service Unavailable (temporary unavailability)

## Related Documentation

- **[SECURITY_RBAC_INTEGRATION.md](SECURITY_RBAC_INTEGRATION.md)**: Security and RBAC integration
- **[RBAC_AUDIT_INTEGRATION.md](RBAC_AUDIT_INTEGRATION.md)**: RBAC and Audit integration
- **[SECURITY_AUDIT_INTEGRATION.md](SECURITY_AUDIT_INTEGRATION.md)**: Security and Audit integration
- **[EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md)**: Event architecture details
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Standardized error handling for security components

## Version History

- **1.1.0**: Updated Error Response Structure to reference ERROR_HANDLING.md (2025-05-22)
- **1.0.0**: Initial API contracts specification
