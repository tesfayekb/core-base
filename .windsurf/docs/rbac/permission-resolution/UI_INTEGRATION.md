
# UI Permission Integration

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides examples and patterns for integrating permission-based controls into UI components, including buttons, menus, and forms.

## UI Component Integration

### Permission-Aware Button

```tsx
// Button with permission check
interface PermissionButtonProps extends ButtonProps {
  action: string;
  resource: string;
  resourceId?: string;
}

export function PermissionButton({
  action,
  resource,
  resourceId,
  children,
  ...props
}: PermissionButtonProps) {
  const { hasPermission } = usePermission(action, resource, resourceId);
  
  if (!hasPermission) {
    return null;
  }
  
  return <Button {...props}>{children}</Button>;
}

// Example usage in a component
function UserActions({ user }: { user: User }) {
  return (
    <div className="actions">
      <PermissionButton
        action="View"
        resource="users"
        resourceId={user.id}
        onClick={() => viewUser(user.id)}
      >
        View
      </PermissionButton>
      
      <PermissionButton
        action="Update"
        resource="users"
        resourceId={user.id}
        onClick={() => editUser(user.id)}
      >
        Edit
      </PermissionButton>
      
      <PermissionButton
        action="Delete"
        resource="users"
        resourceId={user.id}
        onClick={() => deleteUser(user.id)}
      >
        Delete
      </PermissionButton>
    </div>
  );
}
```

### User Menu Based on Permissions

Dynamic user menu based on permissions:

```tsx
function MainNavigation() {
  const { permissions, isLoading } = usePermissionContext();
  
  // Define menu items with required permissions
  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', permission: 'View:dashboard' },
    { label: 'Users', path: '/users', permission: 'ViewAny:users' },
    { label: 'Roles', path: '/roles', permission: 'ViewAny:roles' },
    { label: 'Settings', path: '/settings', permission: 'View:settings' },
    { label: 'Reports', path: '/reports', permission: 'ViewAny:reports' }
  ];
  
  // Filter menu items based on permissions
  const authorizedMenuItems = menuItems.filter(item => {
    if (!item.permission) return true; // No permission required
    
    if (isLoading) return false; // Hide while loading permissions
    
    const [action, resource] = item.permission.split(':');
    return permissions.includes(`${action}:${resource}`);
  });
  
  return (
    <nav className="main-nav">
      <ul>
        {authorizedMenuItems.map(item => (
          <li key={item.path}>
            <Link to={item.path}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Form Field Permission Control

```tsx
// Permission-based form field implementation
import React from 'react';
import { usePermission } from '../hooks/usePermission';

interface PermissionFieldProps {
  resource: string;
  action: string;
  resourceId?: string;
  field: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionField: React.FC<PermissionFieldProps> = ({
  resource,
  action,
  resourceId,
  field,
  fallback = <div className="field-restricted">Restricted</div>
}) => {
  const { hasPermission, isLoading } = usePermission(resource, action, resourceId);
  
  if (isLoading) {
    return <div className="field-loading">Loading...</div>;
  }
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{field}</>;
};

// Usage example:
// <PermissionField
//   resource="users"
//   action="updateEmail"
//   resourceId={user.id}
//   field={
//     <input
//       type="email"
//       value={email}
//       onChange={e => setEmail(e.target.value)}
//     />
//   }
//   fallback={<span>{email}</span>}
// />
```

## API Route Protection

Middleware for protecting API routes with permission checks:

```typescript
/**
 * Permission middleware for API routes
 */
export function requirePermission(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Extract resourceId from request parameters if present
      const resourceId = req.params.id;
      
      // Check permission
      const permissionService = new PermissionService();
      const hasPermission = await permissionService.checkPermission(
        userId,
        action,
        resource,
        resourceId
      );
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // User has permission, proceed
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Usage in routes
router.get(
  '/api/users',
  requirePermission('ViewAny', 'users'),
  usersController.listUsers
);

router.get(
  '/api/users/:id',
  requirePermission('View', 'users'),
  usersController.getUser
);
```

## Related Documentation

- **[IMPLEMENTATION_OVERVIEW.md](IMPLEMENTATION_OVERVIEW.md)**: Implementation overview
- **[FRONTEND_IMPLEMENTATION.md](FRONTEND_IMPLEMENTATION.md)**: Frontend implementation details
- **[BACKEND_IMPLEMENTATION.md](BACKEND_IMPLEMENTATION.md)**: Backend implementation details
- **[../PERMISSION_TYPES.md](../PERMISSION_TYPES.md)**: Permission taxonomy
- **[../../integration/SECURITY_RBAC_INTEGRATION.md](../../integration/SECURITY_RBAC_INTEGRATION.md)**: Security and RBAC integration

## Version History

- **1.0.0**: Initial document created from IMPLEMENTATION.md refactoring (2025-05-23)
