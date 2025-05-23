
# Core Implementation Examples

> **Version**: 1.1.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides essential implementation examples following the standardized patterns from [CORE_PATTERNS.md](CORE_PATTERNS.md). All examples use the same consistent patterns.

## Authentication Implementation

```typescript
/**
 * Standard authentication service implementation
 * Follows patterns from CORE_PATTERNS.md
 */
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantId: z.string().uuid().optional()
});

export const authService = {
  async login(credentials: unknown): Promise<StandardResult<AuthResult>> {
    try {
      // 1. Validate input
      const validation = validateInput(credentials, LoginSchema);
      if (!validation.isValid) {
        return { 
          success: false, 
          error: 'Invalid credentials format',
          code: 'VALIDATION_ERROR'
        };
      }

      // 2. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password
      });

      if (authError) {
        await logAuditEvent('authentication', { 
          email: validation.data.email, 
          status: 'failed',
          metadata: { reason: authError.message }
        });
        return { success: false, error: 'Invalid credentials' };
      }

      // 3. Get tenant access
      const tenantId = validation.data.tenantId || await getDefaultTenant(authData.user.id);
      if (!tenantId) {
        return { success: false, error: 'No tenant access available' };
      }

      // 4. Set tenant context
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

      // 5. Load permissions
      const permissions = await loadUserPermissions(authData.user.id, tenantId);

      // 6. Log success
      await logAuditEvent('authentication', { 
        userId: authData.user.id, 
        tenantId, 
        status: 'success' 
      });

      return {
        success: true,
        data: {
          userId: authData.user.id,
          tenantId,
          session: authData.session,
          permissions
        }
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }
};
```

## Permission Management

```typescript
/**
 * Standard permission service implementation
 */
export const permissionService = {
  async checkPermission(context: PermissionContext): Promise<boolean> {
    try {
      // 1. Check cache
      const cacheKey = `perm:${context.userId}:${context.tenantId}:${context.resourceType}:${context.action}`;
      const cached = permissionCache.get(cacheKey);
      if (cached !== undefined) return cached;

      // 2. Check SuperAdmin
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
        user_id: context.userId
      });
      
      if (isSuperAdmin) {
        permissionCache.set(cacheKey, true, 300);
        return true;
      }

      // 3. Set tenant context and check permission
      await supabase.rpc('set_tenant_context', { tenant_id: context.tenantId });
      
      const { data: hasPermission } = await supabase.rpc('check_user_permission', {
        user_id: context.userId,
        resource_type: context.resourceType,
        action_name: context.action,
        resource_id: context.resourceId
      });

      const result = hasPermission === true;
      permissionCache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }
};
```

## Multi-Tenant Data Access

```typescript
/**
 * Standard tenant-aware repository
 */
export class TenantRepository<T extends { id: string; tenant_id: string }> {
  constructor(private tableName: string) {}

  async findById(
    context: { userId: string; tenantId: string },
    id: string
  ): Promise<StandardResult<T | null>> {
    try {
      // 1. Check permission
      const hasPermission = await permissionService.checkPermission({
        userId: context.userId,
        tenantId: context.tenantId,
        resourceType: this.tableName,
        action: 'ViewAny'
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      // 2. Set tenant context
      await supabase.rpc('set_tenant_context', { tenant_id: context.tenantId });

      // 3. Query with tenant filter
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .eq('tenant_id', context.tenantId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }
        return { success: false, error: error.message };
      }

      // 4. Log access
      await logAuditEvent('data_access', {
        userId: context.userId,
        tenantId: context.tenantId,
        resourceType: this.tableName,
        resourceId: id,
        action: 'view'
      });

      return { success: true, data: data as T };
    } catch (error) {
      console.error('Repository error:', error);
      return { success: false, error: 'Data access failed' };
    }
  }

  async create(
    context: { userId: string; tenantId: string },
    entity: Omit<T, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
  ): Promise<StandardResult<T>> {
    try {
      // 1. Check permission
      const hasPermission = await permissionService.checkPermission({
        userId: context.userId,
        tenantId: context.tenantId,
        resourceType: this.tableName,
        action: 'Create'
      });

      if (!hasPermission) {
        return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
      }

      // 2. Set tenant context
      await supabase.rpc('set_tenant_context', { tenant_id: context.tenantId });

      // 3. Create with tenant_id
      const { data, error } = await supabase
        .from(this.tableName)
        .insert({
          ...entity,
          tenant_id: context.tenantId
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 4. Log creation
      await logAuditEvent('data_access', {
        userId: context.userId,
        tenantId: context.tenantId,
        resourceType: this.tableName,
        resourceId: data.id,
        action: 'create'
      });

      return { success: true, data: data as T };
    } catch (error) {
      console.error('Repository error:', error);
      return { success: false, error: 'Data creation failed' };
    }
  }
}
```

## React Hook Implementation

```typescript
/**
 * Standard permission hook
 */
export function usePermission(
  resourceType: string,
  action: string,
  resourceId?: string
) {
  const [state, setState] = useState({
    hasPermission: false,
    isLoading: true,
    error: null as string | null
  });
  
  const { user, tenantId } = useAuth();

  useEffect(() => {
    if (!user || !tenantId) {
      setState({ hasPermission: false, isLoading: false, error: null });
      return;
    }

    const checkPermission = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const hasPermission = await permissionService.checkPermission({
          userId: user.id,
          tenantId,
          resourceType,
          action,
          resourceId
        });

        setState({ hasPermission, isLoading: false, error: null });
      } catch (error) {
        setState({ 
          hasPermission: false, 
          isLoading: false, 
          error: error.message 
        });
      }
    };

    checkPermission();
  }, [user, tenantId, resourceType, action, resourceId]);

  return state;
}
```

## Component Implementation

```typescript
/**
 * Standard permission gate component
 */
interface PermissionGateProps {
  resourceType: string;
  action: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  resourceType,
  action,
  resourceId,
  children,
  fallback = null
}) => {
  const { hasPermission, isLoading } = usePermission(resourceType, action, resourceId);

  if (isLoading) {
    return <div className="animate-pulse">Checking permissions...</div>;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

## API Route Implementation

```typescript
/**
 * Standard API route with multi-tenant support
 */
export async function handleApiRequest(req: Request): Promise<Response> {
  try {
    // 1. Get user context
    const session = await getSession(req);
    if (!session) {
      return Response.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // 2. Get tenant context
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { success: false, error: 'Missing tenant context' }, 
        { status: 400 }
      );
    }

    // 3. Validate input
    const body = await req.json();
    const validation = validateInput(body, RequestSchema);
    if (!validation.isValid) {
      return Response.json(
        { 
          success: false, 
          error: 'Invalid input',
          details: validation.errors?.format()
        }, 
        { status: 400 }
      );
    }

    // 4. Check permission
    const hasPermission = await permissionService.checkPermission({
      userId: session.user.id,
      tenantId,
      resourceType: 'api_resource',
      action: 'Execute'
    });

    if (!hasPermission) {
      return Response.json(
        { success: false, error: 'Permission denied' }, 
        { status: 403 }
      );
    }

    // 5. Execute business logic
    const result = await executeBusinessLogic(validation.data, {
      userId: session.user.id,
      tenantId
    });

    if (!result.success) {
      return Response.json(result, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

## Utility Functions

```typescript
/**
 * Standard utility functions
 */

// Tenant context utilities
export const tenantUtils = {
  async getCurrentTenant(userId: string): Promise<string | null> {
    try {
      const { data } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();
      
      return data?.tenant_id || null;
    } catch {
      return null;
    }
  },

  async setTenantContext(tenantId: string): Promise<void> {
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
  }
};

// Cache utilities
export const cacheUtils = {
  get<T>(key: string): T | undefined {
    // Implementation depends on cache provider (Redis, memory, etc.)
    return cache.get(key);
  },

  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    cache.set(key, value, ttlSeconds);
  },

  invalidate(pattern: string): void {
    cache.invalidatePattern(pattern);
  }
};

// PII sanitization
export function sanitizePII(data: any): any {
  const sensitiveFields = ['password', 'ssn', 'creditCard', 'email'];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
```

These examples demonstrate the consistent patterns that should be used throughout the system. All implementations must follow these exact patterns for consistency and maintainability.
