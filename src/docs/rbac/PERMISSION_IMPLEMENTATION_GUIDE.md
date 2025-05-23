
# Permission Implementation Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document provides practical implementation guidance for the permission system, including code examples, common patterns, and best practices for implementing permission checks throughout the application layers.

## Permission Check Implementation

### Core Permission Check Service

```typescript
// Core permission check service implementation
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../utils/supabaseClient';

export interface PermissionCheckOptions {
  userId: string;
  resource: string;
  action: string;
  resourceId?: string;
  tenantId?: string;
}

export class PermissionService {
  private client: SupabaseClient;
  private cache: Map<string, { result: boolean; timestamp: number }>;
  private cacheTtl: number; // milliseconds
  
  constructor(
    client: SupabaseClient = createClient(),
    cacheTtl: number = 5 * 60 * 1000 // 5 minutes default
  ) {
    this.client = client;
    this.cache = new Map();
    this.cacheTtl = cacheTtl;
  }
  
  async checkPermission(options: PermissionCheckOptions): Promise<boolean> {
    // 1. Check cache first
    const cacheKey = this.buildCacheKey(options);
    const cachedResult = this.getFromCache(cacheKey);
    
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    
    // 2. Check if user is SuperAdmin (always returns true)
    const isSuperAdmin = await this.isSuperAdmin(options.userId);
    if (isSuperAdmin) {
      this.addToCache(cacheKey, true);
      return true;
    }
    
    // 3. Check permission through database function
    let hasPermission: boolean;
    
    if (options.resourceId) {
      // Resource-specific permission check
      const { data, error } = await this.client.rpc('check_resource_specific_permission', {
        p_user_id: options.userId,
        p_action: options.action,
        p_resource_type: options.resource,
        p_resource_id: options.resourceId,
        p_tenant_id: options.tenantId
      });
      
      if (error) {
        console.error('Permission check error:', error);
        return false;
      }
      
      hasPermission = Boolean(data);
    } else {
      // General permission check
      const { data, error } = await this.client.rpc('check_user_permission', {
        p_user_id: options.userId,
        p_action: options.action,
        p_resource_type: options.resource,
        p_tenant_id: options.tenantId
      });
      
      if (error) {
        console.error('Permission check error:', error);
        return false;
      }
      
      hasPermission = Boolean(data);
    }
    
    // 4. Cache result
    this.addToCache(cacheKey, hasPermission);
    
    // 5. Return result
    return hasPermission;
  }
  
  private async isSuperAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('is_super_admin', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('SuperAdmin check error:', error);
      return false;
    }
    
    return Boolean(data);
  }
  
  private buildCacheKey(options: PermissionCheckOptions): string {
    return `${options.userId}:${options.tenantId || 'global'}:${options.resource}:${options.action}:${options.resourceId || 'any'}`;
  }
  
  private getFromCache(key: string): boolean | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    if (Date.now() - entry.timestamp > this.cacheTtl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.result;
  }
  
  private addToCache(key: string, result: boolean): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
  
  invalidateCache(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }
  
  invalidateAllCache(): void {
    this.cache.clear();
  }
}
```

### Permission Check Hook

```typescript
// React hook for permission checking
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { permissionService } from '../services/permissionService';

export function usePermission(
  resource: string,
  action: string,
  resourceId?: string
): {
  hasPermission: boolean;
  isLoading: boolean;
  error?: string;
} {
  const { user, currentTenantId } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    let mounted = true;
    
    const checkPermission = async () => {
      if (!user) {
        if (mounted) {
          setHasPermission(false);
          setIsLoading(false);
        }
        return;
      }
      
      try {
        const result = await permissionService.checkPermission({
          userId: user.id,
          resource,
          action,
          resourceId,
          tenantId: currentTenantId
        });
        
        if (mounted) {
          setHasPermission(result);
          setError(undefined);
        }
      } catch (err) {
        if (mounted) {
          setHasPermission(false);
          setError(err instanceof Error ? err.message : 'Permission check failed');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    checkPermission();
    
    return () => {
      mounted = false;
    };
  }, [user, resource, action, resourceId, currentTenantId]);
  
  return { hasPermission, isLoading, error };
}
```

### Permission Guard Component

```typescript
// React permission guard component implementation
import React from 'react';
import { usePermission } from '../hooks/usePermission';

interface PermissionGuardProps {
  resource: string;
  action: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  resourceId,
  children,
  fallback = null,
  loadingComponent = <div className="loading">Loading permissions...</div>
}) => {
  const { hasPermission, isLoading } = usePermission(resource, action, resourceId);
  
  if (isLoading) {
    return <>{loadingComponent}</>;
  }
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Usage example:
// <PermissionGuard resource="documents" action="create">
//   <CreateDocumentButton />
// </PermissionGuard>
```

### API Middleware Implementation

```typescript
// Express permission middleware implementation
import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/PermissionService';

export function createPermissionMiddleware(permissionService: PermissionService) {
  return function requirePermission(
    resource: string,
    action: string,
    options: {
      resourceIdParam?: string;
      allowSuperAdmin?: boolean;
    } = {}
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const { resourceIdParam = 'id', allowSuperAdmin = true } = options;
      
      // 1. Get user ID from authenticated request
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // 2. Get tenant ID from request context
      const tenantId = req.headers['x-tenant-id'] as string;
      
      // 3. Get resource ID from request params if specified
      const resourceId = resourceIdParam && req.params[resourceIdParam];
      
      try {
        // 4. Check permission
        const hasPermission = await permissionService.checkPermission({
          userId,
          resource,
          action,
          resourceId,
          tenantId
        });
        
        if (hasPermission) {
          // Permission granted, continue
          next();
        } else {
          // Permission denied
          res.status(403).json({ error: 'Permission denied' });
        }
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({ error: 'Failed to check permissions' });
      }
    };
  };
}

// Usage example:
// const requirePermission = createPermissionMiddleware(permissionService);
// router.post('/documents', requirePermission('documents', 'create'), createDocument);
// router.get('/documents/:id', requirePermission('documents', 'view', { resourceIdParam: 'id' }), getDocument);
```

## Permission-Based UI Implementation

### Permission-Aware Button

```tsx
// Permission-aware button implementation
import React from 'react';
import { usePermission } from '../hooks/usePermission';

interface PermissionButtonProps {
  resource: string;
  action: string;
  resourceId?: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabledClassName?: string;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  resource,
  action,
  resourceId,
  onClick,
  children,
  className = 'btn btn-primary',
  disabledClassName = 'btn btn-primary opacity-50 cursor-not-allowed'
}) => {
  const { hasPermission, isLoading } = usePermission(resource, action, resourceId);
  
  return (
    <button
      className={hasPermission ? className : disabledClassName}
      onClick={hasPermission ? onClick : undefined}
      disabled={isLoading || !hasPermission}
      title={!hasPermission ? 'You do not have permission to perform this action' : undefined}
    >
      {children}
    </button>
  );
};

// Usage example:
// <PermissionButton resource="documents" action="delete" resourceId={doc.id} onClick={handleDelete}>
//   Delete
// </PermissionButton>
```

### Navigation Menu with Permissions

```tsx
// Permission-based navigation menu implementation
import React from 'react';
import { Link } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';

interface MenuItem {
  label: string;
  path: string;
  resource: string;
  action: string;
  icon?: React.ReactNode;
}

interface PermissionNavMenuProps {
  items: MenuItem[];
}

export const PermissionNavMenu: React.FC<PermissionNavMenuProps> = ({ items }) => {
  return (
    <nav className="navigation-menu">
      <ul>
        {items.map(item => (
          <MenuItemWithPermission key={item.path} item={item} />
        ))}
      </ul>
    </nav>
  );
};

const MenuItemWithPermission: React.FC<{ item: MenuItem }> = ({ item }) => {
  const { hasPermission, isLoading } = usePermission(item.resource, item.action);
  
  if (isLoading || !hasPermission) {
    return null;
  }
  
  return (
    <li>
      <Link to={item.path} className="menu-item">
        {item.icon && <span className="menu-icon">{item.icon}</span>}
        <span className="menu-label">{item.label}</span>
      </Link>
    </li>
  );
};

// Usage example:
// const menuItems = [
//   { label: 'Dashboard', path: '/dashboard', resource: 'dashboard', action: 'view' },
//   { label: 'Users', path: '/users', resource: 'users', action: 'viewAny' },
//   { label: 'Settings', path: '/settings', resource: 'settings', action: 'view' }
// ];
// <PermissionNavMenu items={menuItems} />
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

## Database-Level Permission Enforcement

### Row Level Security Policies

```sql
-- Example row level security policy implementation

-- Resources table with RLS
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content JSONB,
  owner_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Policy for viewing resources
CREATE POLICY resource_view_policy ON resources
  FOR SELECT
  USING (
    -- Can view if:
    (
      -- 1. User has explicit view permission
      check_user_permission(auth.uid(), 'View', 'resources')
      
      AND
      
      -- 2. Resource belongs to user's current tenant
      tenant_id = get_user_current_tenant(auth.uid())
    )
    
    OR
    
    -- 3. User is the resource owner
    owner_id = auth.uid()
    
    OR
    
    -- 4. User has specific permission for this resource
    check_resource_specific_permission(
      auth.uid(), 
      'View', 
      'resources',
      id
    )
  );

-- Policy for updating resources
CREATE POLICY resource_update_policy ON resources
  FOR UPDATE
  USING (
    -- Can update if:
    (
      -- 1. User has explicit update permission
      check_user_permission(auth.uid(), 'Update', 'resources')
      
      AND
      
      -- 2. Resource belongs to user's current tenant
      tenant_id = get_user_current_tenant(auth.uid())
    )
    
    OR
    
    -- 3. User is the resource owner and owners can update
    (
      owner_id = auth.uid()
      AND
      check_owner_permission('resources', 'Update')
    )
  );

-- Similar policies for INSERT and DELETE
-- ...
```

### Permission Check Functions

```sql
-- Function to check resource owner permissions
CREATE OR REPLACE FUNCTION check_owner_permission(
  p_resource_type TEXT,
  p_action TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this resource type grants this action to owners
  RETURN EXISTS (
    SELECT 1
    FROM owner_permissions
    WHERE resource_name = p_resource_type
    AND action = p_action
  );
END;
$$;
```

## Client-Side Permission Utilities

### Permission Helper Functions

```typescript
// Permission helper functions implementation
import { PermissionService } from '../services/PermissionService';

export class PermissionHelper {
  private permissionService: PermissionService;
  
  constructor(permissionService: PermissionService) {
    this.permissionService = permissionService;
  }
  
  async canPerformBulkAction(
    userId: string,
    resource: string,
    action: string,
    resourceIds: string[],
    tenantId?: string
  ): Promise<{
    allGranted: boolean;
    grantedIds: string[];
    deniedIds: string[];
  }> {
    const results = await Promise.all(
      resourceIds.map(async id => ({
        id,
        granted: await this.permissionService.checkPermission({
          userId,
          resource,
          action,
          resourceId: id,
          tenantId
        })
      }))
    );
    
    const grantedIds = results.filter(r => r.granted).map(r => r.id);
    const deniedIds = results.filter(r => !r.granted).map(r => r.id);
    
    return {
      allGranted: deniedIds.length === 0,
      grantedIds,
      deniedIds
    };
  }
  
  async hasAnyPermission(
    userId: string,
    checks: Array<{ resource: string; action: string; resourceId?: string }>,
    tenantId?: string
  ): Promise<boolean> {
    for (const check of checks) {
      const hasPermission = await this.permissionService.checkPermission({
        userId,
        resource: check.resource,
        action: check.action,
        resourceId: check.resourceId,
        tenantId
      });
      
      if (hasPermission) {
        return true;
      }
    }
    
    return false;
  }
  
  async hasAllPermissions(
    userId: string,
    checks: Array<{ resource: string; action: string; resourceId?: string }>,
    tenantId?: string
  ): Promise<boolean> {
    for (const check of checks) {
      const hasPermission = await this.permissionService.checkPermission({
        userId,
        resource: check.resource,
        action: check.action,
        resourceId: check.resourceId,
        tenantId
      });
      
      if (!hasPermission) {
        return false;
      }
    }
    
    return true;
  }
}

// Usage example:
// const permissionHelper = new PermissionHelper(permissionService);
// const canDeleteAll = await permissionHelper.canPerformBulkAction(
//   userId,
//   'documents',
//   'delete',
//   selectedDocumentIds
// );
```

### Permission Cache Service

```typescript
// Permission cache service implementation
export class PermissionCacheService {
  private cache: Map<string, { result: boolean; expires: number }>;
  private defaultTtl: number; // milliseconds
  
  constructor(defaultTtl: number = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
  }
  
  get(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    tenantId?: string
  ): boolean | undefined {
    const key = this.buildKey(userId, resource, action, resourceId, tenantId);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return undefined;
    }
    
    if (cached.expires < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return cached.result;
  }
  
  set(
    userId: string,
    resource: string,
    action: string,
    result: boolean,
    ttl: number = this.defaultTtl,
    resourceId?: string,
    tenantId?: string
  ): void {
    const key = this.buildKey(userId, resource, action, resourceId, tenantId);
    
    this.cache.set(key, {
      result,
      expires: Date.now() + ttl
    });
  }
  
  invalidate(
    userId: string,
    resource?: string,
    action?: string,
    resourceId?: string,
    tenantId?: string
  ): void {
    if (!resource && !action && !resourceId && !tenantId) {
      // Invalidate all user permissions
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
      return;
    }
    
    const keyPrefix = this.buildKeyPrefix(userId, resource, action, resourceId, tenantId);
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  private buildKey(
    userId: string,
    resource: string,
    action: string,
    resourceId?: string,
    tenantId?: string
  ): string {
    return `${userId}:${tenantId || 'global'}:${resource}:${action}:${resourceId || 'any'}`;
  }
  
  private buildKeyPrefix(
    userId: string,
    resource?: string,
    action?: string,
    resourceId?: string,
    tenantId?: string
  ): string {
    let prefix = `${userId}:`;
    
    if (tenantId) {
      prefix += `${tenantId}:`;
    }
    
    if (resource) {
      prefix += `${resource}:`;
      
      if (action) {
        prefix += `${action}:`;
        
        if (resourceId) {
          prefix += `${resourceId}:`;
        }
      }
    }
    
    return prefix;
  }
}
```

## Related Documentation

- **[README.md](README.md)**: RBAC system overview
- **[ROLE_ARCHITECTURE.md](ROLE_ARCHITECTURE.md)**: Role definition and structure
- **[PERMISSION_TYPES.md](PERMISSION_TYPES.md)**: Permission taxonomy
- **[PERMISSION_RESOLUTION.md](PERMISSION_RESOLUTION.md)**: Permission resolution process
- **[CACHING_STRATEGY.md](CACHING_STRATEGY.md)**: Permission caching approach
- **[permission-resolution/RESOLUTION_ALGORITHM_CORE.md](permission-resolution/RESOLUTION_ALGORITHM_CORE.md)**: Resolution algorithm details
- **[entity-boundaries/IMPLEMENTATION_PATTERNS.md](entity-boundaries/IMPLEMENTATION_PATTERNS.md)**: Entity boundary enforcement

## Version History

- **1.0.0**: Initial permission implementation guide (2025-05-22)
