
# Permission System Implementation Examples

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

Concrete permission system implementation examples for AI development platforms.

## Permission Check Hook

```typescript
// React hook for permission checking
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { usePermissionCache } from './usePermissionCache';

export function usePermission(
  resourceType: string,
  action: string,
  resourceId?: string
): {
  hasPermission: boolean;
  isLoading: boolean;
  error?: string;
} {
  const { user, tenantId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { checkCache, updateCache } = usePermissionCache();
  
  const checkPermission = useCallback(async () => {
    if (!user) {
      setHasPermission(false);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 1. Check permission cache first
      const cacheKey = `${user.id}:${tenantId}:${resourceType}:${action}:${resourceId || 'any'}`;
      const cachedValue = checkCache(cacheKey);
      
      if (cachedValue !== undefined) {
        setHasPermission(cachedValue);
        setIsLoading(false);
        return;
      }
      
      // 2. If not in cache, check via API
      const response = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resourceType,
          action,
          resourceId,
          tenantId
        })
      });
      
      if (!response.ok) {
        throw new Error('Permission check failed');
      }
      
      const { granted } = await response.json();
      
      // 3. Update cache and state
      updateCache(cacheKey, granted);
      setHasPermission(granted);
      setError(undefined);
    } catch (e) {
      const error = e as Error;
      setError(error.message);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, tenantId, resourceType, action, resourceId, checkCache, updateCache]);
  
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);
  
  return { hasPermission, isLoading, error };
}
```

## Permission Gate Component

```typescript
// Permission gate component for conditional rendering
import React from 'react';
import { usePermission } from '../hooks/usePermission';

interface PermissionGateProps {
  resourceType: string;
  action: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  resourceType,
  action,
  resourceId,
  children,
  fallback = null,
  loading = <div className="animate-pulse">Checking permissions...</div>
}) => {
  const { hasPermission, isLoading, error } = usePermission(
    resourceType, 
    action, 
    resourceId
  );
  
  if (isLoading) {
    return <>{loading}</>;
  }
  
  if (error) {
    console.error('Permission check error:', error);
    return <>{fallback}</>;
  }
  
  if (hasPermission) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Usage examples:
export const Examples = () => {
  return (
    <div>
      {/* Basic usage */}
      <PermissionGate resourceType="users" action="create">
        <button>Create User</button>
      </PermissionGate>
      
      {/* With fallback */}
      <PermissionGate 
        resourceType="users" 
        action="create"
        fallback={<div>You don't have permission to create users</div>}
      >
        <button>Create User</button>
      </PermissionGate>
      
      {/* Resource-specific permission */}
      <PermissionGate 
        resourceType="articles" 
        action="edit"
        resourceId="article-123"
      >
        <button>Edit Article</button>
      </PermissionGate>
    </div>
  );
};
```

## Permission Service

```typescript
// Backend permission service
export class PermissionService {
  constructor(
    private db: Database,
    private cache: CacheService
  ) {}
  
  async checkPermission(context: {
    userId: string;
    resourceType: string;
    action: string;
    resourceId?: string;
    tenantId?: string;
  }): Promise<boolean> {
    const { userId, resourceType, action, resourceId, tenantId } = context;
    
    // 1. Check cache first
    const cacheKey = this.buildCacheKey(context);
    const cached = await this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached === 'true';
    }
    
    // 2. Check if user is SuperAdmin
    if (await this.isSuperAdmin(userId)) {
      await this.cache.set(cacheKey, 'true', 300);
      return true;
    }
    
    // 3. Check specific permission
    const hasPermission = await this.checkSpecificPermission(context);
    
    // 4. Cache result
    await this.cache.set(cacheKey, hasPermission.toString(), 300);
    
    return hasPermission;
  }
  
  private async checkSpecificPermission(context: {
    userId: string;
    resourceType: string;
    action: string;
    resourceId?: string;
    tenantId?: string;
  }): Promise<boolean> {
    const { userId, resourceType, action, tenantId } = context;
    
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        JOIN resources r ON p.resource_id = r.id
        WHERE ur.user_id = $1
        AND r.name = $2
        AND p.action = $3
        AND ($4 IS NULL OR ur.tenant_id = $4)
      ) as has_permission
    `;
    
    const result = await this.db.query(query, [
      userId,
      resourceType,
      action,
      tenantId
    ]);
    
    return result.rows[0]?.has_permission || false;
  }
  
  private async isSuperAdmin(userId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
        AND r.name = 'SuperAdmin'
      ) as is_super_admin
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows[0]?.is_super_admin || false;
  }
  
  private buildCacheKey(context: {
    userId: string;
    resourceType: string;
    action: string;
    resourceId?: string;
    tenantId?: string;
  }): string {
    const { userId, resourceType, action, resourceId, tenantId } = context;
    return `perm:${userId}:${tenantId || 'global'}:${resourceType}:${action}:${resourceId || 'any'}`;
  }
  
  async invalidateUserPermissions(userId: string, tenantId?: string): Promise<void> {
    const pattern = `perm:${userId}:${tenantId || '*'}:*`;
    await this.cache.deletePattern(pattern);
  }
}
```

## Role Permission Management

```typescript
// Role permission management service
export class RolePermissionService {
  constructor(private db: Database) {}
  
  async grantPermission(
    roleId: string, 
    resourceType: string, 
    action: string
  ): Promise<void> {
    // 1. Get resource ID from type
    const resource = await this.db.query(
      'SELECT id FROM resources WHERE name = $1',
      [resourceType]
    );
    
    if (resource.rows.length === 0) {
      throw new Error(`Resource ${resourceType} not found`);
    }
    
    const resourceId = resource.rows[0].id;
    
    // 2. Get or create permission
    let permission = await this.db.query(
      'SELECT id FROM permissions WHERE resource_id = $1 AND action = $2',
      [resourceId, action]
    );
    
    if (permission.rows.length === 0) {
      // Create permission if it doesn't exist
      permission = await this.db.query(
        'INSERT INTO permissions (resource_id, action) VALUES ($1, $2) RETURNING id',
        [resourceId, action]
      );
    }
    
    const permissionId = permission.rows[0].id;
    
    // 3. Grant permission to role (ignore if already exists)
    await this.db.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ($1, $2)
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `, [roleId, permissionId]);
  }
  
  async revokePermission(
    roleId: string, 
    resourceType: string, 
    action: string
  ): Promise<void> {
    await this.db.query(`
      DELETE FROM role_permissions
      WHERE role_id = $1
      AND permission_id IN (
        SELECT p.id
        FROM permissions p
        JOIN resources r ON p.resource_id = r.id
        WHERE r.name = $2 AND p.action = $3
      )
    `, [roleId, resourceType, action]);
  }
  
  async listRolePermissions(roleId: string): Promise<Array<{
    resource: string;
    action: string;
  }>> {
    const result = await this.db.query(`
      SELECT r.name as resource, p.action
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN resources r ON p.resource_id = r.id
      WHERE rp.role_id = $1
      ORDER BY r.name, p.action
    `, [roleId]);
    
    return result.rows.map(row => ({
      resource: row.resource,
      action: row.action
    }));
  }
  
  async assignRoleToUser(
    userId: string, 
    roleId: string, 
    tenantId?: string
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO user_roles (user_id, role_id, tenant_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, role_id, tenant_id) DO NOTHING
    `, [userId, roleId, tenantId]);
  }
  
  async removeRoleFromUser(
    userId: string, 
    roleId: string, 
    tenantId?: string
  ): Promise<void> {
    await this.db.query(`
      DELETE FROM user_roles
      WHERE user_id = $1 AND role_id = $2
      AND ($3 IS NULL OR tenant_id = $3)
    `, [userId, roleId, tenantId]);
  }
}
```

## API Route Protection

```typescript
// Express middleware for protecting API routes
export function requirePermission(
  resourceType: string, 
  action: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const permissionService = new PermissionService(db, cache);
    const hasPermission = await permissionService.checkPermission({
      userId,
      resourceType,
      action,
      tenantId
    });
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Permission denied',
        required: `${resourceType}:${action}`
      });
    }
    
    next();
  };
}

// Usage examples:
app.get('/api/users', 
  requireAuth,
  requirePermission('users', 'viewAny'), 
  getUsersHandler
);

app.post('/api/users', 
  requireAuth,
  requirePermission('users', 'create'), 
  createUserHandler
);

app.put('/api/users/:id', 
  requireAuth,
  requirePermission('users', 'update'), 
  updateUserHandler
);

app.delete('/api/users/:id', 
  requireAuth,
  requirePermission('users', 'delete'), 
  deleteUserHandler
);
```

## Testing Permissions

```typescript
// Permission testing utilities
describe('Permission System', () => {
  let permissionService: PermissionService;
  let roleService: RolePermissionService;
  
  beforeEach(async () => {
    // Setup test database and services
    permissionService = new PermissionService(testDb, testCache);
    roleService = new RolePermissionService(testDb);
  });
  
  describe('Basic permission checks', () => {
    it('should grant access to users with correct permissions', async () => {
      // Setup: Create user with role that has permission
      const userId = await createTestUser();
      const roleId = await createTestRole('editor');
      await roleService.grantPermission(roleId, 'articles', 'create');
      await roleService.assignRoleToUser(userId, roleId);
      
      // Test
      const hasPermission = await permissionService.checkPermission({
        userId,
        resourceType: 'articles',
        action: 'create'
      });
      
      expect(hasPermission).toBe(true);
    });
    
    it('should deny access to users without permissions', async () => {
      const userId = await createTestUser();
      
      const hasPermission = await permissionService.checkPermission({
        userId,
        resourceType: 'articles',
        action: 'delete'
      });
      
      expect(hasPermission).toBe(false);
    });
  });
  
  describe('SuperAdmin permissions', () => {
    it('should grant all permissions to SuperAdmin', async () => {
      const userId = await createTestUser();
      const superAdminRole = await createTestRole('SuperAdmin');
      await roleService.assignRoleToUser(userId, superAdminRole);
      
      const hasPermission = await permissionService.checkPermission({
        userId,
        resourceType: 'any-resource',
        action: 'any-action'
      });
      
      expect(hasPermission).toBe(true);
    });
  });
  
  describe('Multi-tenant permissions', () => {
    it('should scope permissions to tenant context', async () => {
      const userId = await createTestUser();
      const roleId = await createTestRole('tenant-admin');
      const tenantId = 'tenant-123';
      
      await roleService.grantPermission(roleId, 'users', 'manage');
      await roleService.assignRoleToUser(userId, roleId, tenantId);
      
      // Should have permission in correct tenant
      const hasPermissionInTenant = await permissionService.checkPermission({
        userId,
        resourceType: 'users',
        action: 'manage',
        tenantId
      });
      
      // Should not have permission in different tenant
      const hasPermissionInOtherTenant = await permissionService.checkPermission({
        userId,
        resourceType: 'users',
        action: 'manage',
        tenantId: 'other-tenant'
      });
      
      expect(hasPermissionInTenant).toBe(true);
      expect(hasPermissionInOtherTenant).toBe(false);
    });
  });
});
```

## Related Examples

- **Authentication Examples**: `AUTH_EXAMPLES.md`
- **Multi-tenant Examples**: `MULTITENANT_EXAMPLES.md`
- **Audit Examples**: `AUDIT_EXAMPLES.md`

These permission examples provide comprehensive coverage of the RBAC system implementation.
