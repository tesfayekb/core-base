
# Core Implementation Patterns

> **Version**: 2.1.0  
> **Last Updated**: 2025-05-23

## Overview

Essential code patterns used throughout the system. **ALL** implementations must follow these exact patterns for consistency.

## Standard Error Handling Pattern

```typescript
// Standard error response format
interface StandardError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

interface StandardSuccess<T> {
  success: true;
  data: T;
}

type StandardResult<T> = StandardSuccess<T> | StandardError;

// Standard async function pattern
async function standardFunction<T>(params: any): Promise<StandardResult<T>> {
  try {
    // 1. Validate inputs
    const validation = validateInput(params);
    if (!validation.isValid) {
      return { 
        success: false, 
        error: 'Invalid input', 
        code: 'VALIDATION_ERROR',
        details: validation.errors 
      };
    }

    // 2. Execute business logic
    const result = await executeLogic(validation.data);

    // 3. Return success
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in standardFunction:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      code: 'EXECUTION_ERROR'
    };
  }
}
```

## Authentication Pattern

```typescript
// Standard authentication flow
interface AuthCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

interface AuthResult {
  userId: string;
  tenantId: string;
  session: Session;
  permissions: string[];
}

const authenticateUser = async (credentials: AuthCredentials): Promise<StandardResult<AuthResult>> => {
  try {
    // 1. Validate credentials format
    const validation = validateCredentials(credentials);
    if (!validation.isValid) {
      return { success: false, error: 'Invalid credentials format' };
    }

    // 2. Verify against auth provider
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (authError) {
      await logAuditEvent('authentication', { 
        email: credentials.email, 
        success: false, 
        reason: authError.message 
      });
      return { success: false, error: authError.message };
    }

    // 3. Determine tenant context
    const tenantId = credentials.tenantId || await getDefaultTenant(authData.user.id);
    if (!tenantId) {
      return { success: false, error: 'No tenant access available' };
    }

    // 4. Load permissions
    const permissions = await loadUserPermissions(authData.user.id, tenantId);

    // 5. Create session with tenant context
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // 6. Log successful authentication
    await logAuditEvent('authentication', { 
      userId: authData.user.id, 
      tenantId, 
      success: true 
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
};
```

## Permission Check Pattern

```typescript
// Standard permission check context
interface PermissionContext {
  userId: string;
  tenantId: string;
  resourceType: string;
  action: string;
  resourceId?: string;
}

const checkPermission = async (context: PermissionContext): Promise<boolean> => {
  try {
    // 1. Check cache first (5-minute TTL)
    const cacheKey = `perm:${context.userId}:${context.tenantId}:${context.resourceType}:${context.action}:${context.resourceId || 'any'}`;
    const cached = permissionCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // 2. Check SuperAdmin status
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
      user_id: context.userId
    });
    
    if (isSuperAdmin) {
      permissionCache.set(cacheKey, true, 300); // 5 minutes
      return true;
    }

    // 3. Set tenant context
    await supabase.rpc('set_tenant_context', { tenant_id: context.tenantId });

    // 4. Check specific permission
    const { data: hasPermission } = await supabase.rpc('check_user_permission', {
      user_id: context.userId,
      resource_type: context.resourceType,
      action_name: context.action,
      resource_id: context.resourceId
    });

    // 5. Cache result
    const result = hasPermission === true;
    permissionCache.set(cacheKey, result, 300); // 5 minutes

    return result;
  } catch (error) {
    console.error('Permission check error:', error);
    return false; // Fail closed
  }
};
```

## Multi-Tenant Query Pattern

```typescript
// Standard multi-tenant query options
interface QueryOptions<T> {
  table: string;
  select?: string;
  where?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

const executeQuery = async <T>(
  context: { userId: string; tenantId: string },
  options: QueryOptions<T>
): Promise<StandardResult<T[]>> => {
  try {
    // 1. Validate tenant context
    if (!context.tenantId) {
      return { success: false, error: 'No tenant context provided' };
    }

    // 2. Check permission
    const hasPermission = await checkPermission({
      userId: context.userId,
      tenantId: context.tenantId,
      resourceType: options.table,
      action: 'ViewAny'
    });

    if (!hasPermission) {
      return { success: false, error: 'Permission denied', code: 'PERMISSION_DENIED' };
    }

    // 3. Set tenant context
    await supabase.rpc('set_tenant_context', { tenant_id: context.tenantId });

    // 4. Build query with tenant filter
    let query = supabase
      .from(options.table)
      .select(options.select || '*')
      .eq('tenant_id', context.tenantId);

    // Apply additional filters
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending !== false 
      });
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
    }

    // 5. Execute query
    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // 6. Log data access
    await logAuditEvent('data_access', {
      userId: context.userId,
      tenantId: context.tenantId,
      table: options.table,
      action: 'query',
      recordCount: data?.length || 0
    });

    return { success: true, data: data as T[] };
  } catch (error) {
    console.error('Query execution error:', error);
    return { success: false, error: 'Query execution failed' };
  }
};
```

## Audit Logging Pattern

```typescript
// Standard audit event structure
interface AuditEvent {
  eventType: string;
  userId?: string;
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  status?: 'success' | 'failed' | 'error';
  metadata?: Record<string, any>;
}

const logAuditEvent = async (
  eventType: string,
  data: Omit<AuditEvent, 'eventType'>
): Promise<void> => {
  try {
    // 1. Create standardized audit event
    const auditEvent: AuditEvent = {
      eventType,
      ...data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'application',
        ...data.metadata
      }
    };

    // 2. Sanitize PII
    const sanitizedEvent = sanitizePII(auditEvent);

    // 3. Store audit event
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        event_type: sanitizedEvent.eventType,
        user_id: sanitizedEvent.userId,
        tenant_id: sanitizedEvent.tenantId,
        resource_type: sanitizedEvent.resourceType,
        resource_id: sanitizedEvent.resourceId,
        action: sanitizedEvent.action,
        status: sanitizedEvent.status || 'success',
        metadata: sanitizedEvent.metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Audit logging error:', error);
    }
  } catch (error) {
    // Never let audit logging break the main flow
    console.error('Audit logging error:', error);
  }
};
```

## Input Validation Pattern

```typescript
import { z } from 'zod';

// Standard validation function
const validateInput = <T>(
  input: unknown,
  schema: z.ZodSchema<T>
): { isValid: boolean; data?: T; errors?: z.ZodError } => {
  try {
    const validatedData = schema.parse(input);
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error };
    }
    throw error; // Re-throw unexpected errors
  }
};

// Standard schemas
const EmailSchema = z.string().email().min(1).max(255);
const PasswordSchema = z.string().min(8).max(128);
const UUIDSchema = z.string().uuid();
const TenantIdSchema = UUIDSchema;
const UserIdSchema = UUIDSchema;

// Example usage
const UserCredentialsSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  tenantId: TenantIdSchema.optional()
});
```

## Critical Implementation Rules

1. **Always use StandardResult<T> for async operations**
2. **Always check permissions before data access**
3. **Always include tenant_id in multi-tenant queries**
4. **Always log audit events for user actions**
5. **Always validate inputs with Zod schemas**
6. **Always handle errors gracefully with try-catch**
7. **Always use consistent caching patterns**
8. **Never expose sensitive data in error messages**

## Performance Standards

- Permission checks: Cache for 5 minutes
- Database connections: Use connection pooling
- Query optimization: Always include tenant_id in WHERE clauses
- Audit logging: Never block main execution flow
- Error handling: Fail closed for security checks

These patterns ensure consistency, security, and maintainability across the entire system.
