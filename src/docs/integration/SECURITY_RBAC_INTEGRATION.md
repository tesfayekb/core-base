# Security and RBAC Integration

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-22

## Overview

This document details the integration points between the Security system and the Role-Based Access Control (RBAC) system, defining how authentication flows integrate with permission resolution.

## Authentication to Permission Resolution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant AS as AuthService
    participant PS as PermissionService
    participant RC as RoleCache
    
    U->>AS: Login(credentials)
    AS->>AS: Verify credentials
    AS->>PS: GetUserRoles(userId)
    PS->>RC: FetchCachedRoles(userId)
    RC-->>PS: roles[]
    PS-->>AS: User with roles
    AS-->>U: AuthResponse(token, user)
```

## Integration Interfaces

### Permission Check Interface

```typescript
interface PermissionCheckInterface {
  /**
   * Check if a user has a specific permission on a resource
   */
  checkPermission(
    userId: string, 
    resource: string, 
    action: string, 
    resourceId?: string,
    context?: Record<string, any>
  ): Promise<boolean>;
  
  /**
   * Check multiple permissions at once for efficiency
   */
  checkMultiplePermissions(
    userId: string,
    checks: Array<{
      resource: string;
      action: string;
      resourceId?: string;
      context?: Record<string, any>;
    }>
  ): Promise<Array<{
    resource: string;
    action: string;
    granted: boolean;
  }>>;
  
  /**
   * Efficiently check if user has any of the specified permissions
   */
  hasAnyPermission(
    userId: string,
    permissions: Array<{
      resource: string;
      action: string;
    }>
  ): Promise<boolean>;
}
```

### Role Management Interface

```typescript
interface RoleManagementInterface {
  /**
   * Get all roles assigned to a user
   */
  getUserRoles(userId: string): Promise<Role[]>;
  
  /**
   * Assign a role to a user
   */
  assignRoleToUser(
    userId: string, 
    roleId: string, 
    assignedBy: string
  ): Promise<void>;
  
  /**
   * Remove a role from a user
   */
  removeRoleFromUser(
    userId: string, 
    roleId: string, 
    removedBy: string
  ): Promise<void>;
  
  /**
   * Check if a user has specific role
   */
  userHasRole(userId: string, roleName: string): Promise<boolean>;
}
```

## Implementation Requirements

### Authentication Middleware

```typescript
// Authentication middleware implementation
function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Verify token and extract user ID
    const decoded = verifyToken(token);
    const userId = decoded.sub;
    
    // Get user roles using RBAC integration
    const roles = await permissionService.getUserRoles(userId);
    
    // Store user and roles in request context
    req.user = {
      id: userId,
      roles,
      permissions: decoded.permissions || []
    };
    
    // Continue to next middleware
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid authentication' });
  }
}
```

### Authorization Integration Points

Permission checks should be performed at these integration points:
- API endpoints via middleware
- Route guards in frontend applications
- UI component rendering logic
- Service layer business logic
- Database queries through RLS policies

## Authentication Result Structure

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

## Permission Check Request/Response

```typescript
interface PermissionCheckRequest {
  userId: string;
  resource: string;
  action: string;
  resourceId?: string;
  context?: Record<string, any>;
}

interface PermissionCheckResponse {
  granted: boolean;
  reason?: string;
  grantedBy?: {
    roleId: string;
    roleName: string;
  };
}
```

## Error Handling

The Security and RBAC integration must implement standardized error handling following the guidelines in [../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md):

1. **Authentication Errors**
   - All authentication failures must follow the standardized error format
   - Error responses must never reveal whether a user exists
   - Multiple authentication failures must trigger appropriate security events

2. **Permission Check Errors**
   - Permission denials must be logged with appropriate context
   - Errors must include traceId for correlation with audit logs
   - Performance optimizations for error cases should follow [../rbac/PERMISSION_QUERY_OPTIMIZATION.md](../rbac/PERMISSION_QUERY_OPTIMIZATION.md)

3. **Critical Integration Errors**
   - Service unavailability must be handled gracefully
   - Fallback mechanisms must be implemented for critical security functions
   - All integration errors must be properly classified and logged

## Related Documentation

- **[../security/AUTH_SYSTEM.md](../security/AUTH_SYSTEM.md)**: Authentication system details
- **[../security/ERROR_HANDLING.md](../security/ERROR_HANDLING.md)**: Standardized error handling
- **[../rbac/PERMISSION_RESOLUTION.md](../rbac/PERMISSION_RESOLUTION.md)**: Permission resolution process
- **[SECURITY_AUDIT_INTEGRATION.md](SECURITY_AUDIT_INTEGRATION.md)**: Security audit integration
- **[EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md)**: Event architecture for integration

## Version History

- **1.1.0**: Added explicit error handling section referencing ERROR_HANDLING.md (2025-05-22)
- **1.0.0**: Initial Security and RBAC integration specification
