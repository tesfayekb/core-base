# Shared Implementation Patterns

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

**MANDATORY**: All implementations across ALL phases MUST use these shared patterns. **Never deviate from these patterns** - they ensure consistency, security, and performance across the entire system.

## CRITICAL: Performance Measurement Requirement

**ALL shared patterns MUST include performance measurement** using the [PERFORMANCE_MEASUREMENT_INFRASTRUCTURE.md](PERFORMANCE_MEASUREMENT_INFRASTRUCTURE.md).

```typescript
import { measureTenantQuery, measurePermissionQuery, measureAuditWrite } from './performance/DATABASE_MEASUREMENT_UTILITIES';
```

## 1. Tenant Context Management (MANDATORY)

**Pattern**: `SharedTenantContextService`
**Target**: All operations under 20ms for tenant isolation

```typescript
// MANDATORY: Use this service for ALL tenant operations
export class SharedTenantContextService {
  private static instance: SharedTenantContextService;
  private currentTenantId: string | null = null;
  
  static getInstance(): SharedTenantContextService {
    if (!SharedTenantContextService.instance) {
      SharedTenantContextService.instance = new SharedTenantContextService();
    }
    return SharedTenantContextService.instance;
  }
  
  // MANDATORY: Performance measured tenant context switching
  async setTenantContext(tenantId: string): Promise<void> {
    await measureTenantQuery('set_tenant_context', async () => {
      this.currentTenantId = tenantId;
      
      // Set database context for RLS
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
      
      return { success: true };
    });
  }
  
  // MANDATORY: Performance measured tenant validation
  async validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    return await measureTenantQuery('validate_tenant_access', async () => {
      const { data, error } = await supabase
        .from('user_tenants')
        .select('id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();
      
      return !error && !!data;
    });
  }
  
  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }
}
```

## 2. Database Query Pattern (MANDATORY)

**Pattern**: `executeTenantQuery`
**Targets**: Simple queries <10ms, Complex queries <50ms

```typescript
// MANDATORY: Use for ALL database operations with performance measurement
export async function executeTenantQuery<T>(
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete',
  data?: any,
  filters?: Record<string, any>
): Promise<StandardResult<T>> {
  const queryType = operation === 'select' && filters && Object.keys(filters).length > 2 ? 'complex' : 'simple';
  
  return await measureTenantQuery(`${table}_${operation}`, async () => {
    try {
      const tenantService = SharedTenantContextService.getInstance();
      const tenantId = tenantService.getCurrentTenantId();
      
      if (!tenantId) {
        return { success: false, error: 'No tenant context set', code: 'NO_TENANT_CONTEXT' };
      }
      
      let query = supabase.from(table);
      
      // Add tenant filter to all operations
      const tenantFilter = { tenant_id: tenantId, ...filters };
      
      switch (operation) {
        case 'select':
          const { data: selectData, error: selectError } = await query
            .select(data || '*')
            .match(tenantFilter);
          
          if (selectError) {
            return { success: false, error: selectError.message, code: 'DB_ERROR' };
          }
          
          return { success: true, data: selectData as T };
          
        case 'insert':
          const insertData = { ...data, tenant_id: tenantId };
          const { data: insertResult, error: insertError } = await query
            .insert(insertData)
            .select();
          
          if (insertError) {
            return { success: false, error: insertError.message, code: 'DB_ERROR' };
          }
          
          return { success: true, data: insertResult as T };
          
        case 'update':
          const { data: updateResult, error: updateError } = await query
            .update(data)
            .match(tenantFilter)
            .select();
          
          if (updateError) {
            return { success: false, error: updateError.message, code: 'DB_ERROR' };
          }
          
          return { success: true, data: updateResult as T };
          
        case 'delete':
          const { data: deleteResult, error: deleteError } = await query
            .delete()
            .match(tenantFilter)
            .select();
          
          if (deleteError) {
            return { success: false, error: deleteError.message, code: 'DB_ERROR' };
          }
          
          return { success: true, data: deleteResult as T };
          
        default:
          return { success: false, error: 'Invalid operation', code: 'INVALID_OPERATION' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNEXPECTED_ERROR'
      };
    }
  });
}
```

## 3. Permission Check Pattern (MANDATORY)

**Pattern**: `checkPermission`
**Target**: <15ms for permission resolution

```typescript
// MANDATORY: Use for ALL permission checks with performance measurement
export async function checkPermission(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string
): Promise<boolean> {
  return await measurePermissionQuery(`${resource}_${action}_permission`, async () => {
    try {
      // Use cached permission check for performance
      const cacheKey = `permission:${userId}:${action}:${resource}:${resourceId || 'any'}`;
      const cached = await getCachedPermission(cacheKey);
      
      if (cached !== null) {
        return cached;
      }
      
      // Database permission check
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: userId,
        p_action: action,
        p_resource: resource,
        p_resource_id: resourceId
      });
      
      if (error) {
        console.error('Permission check error:', error);
        return false;
      }
      
      const hasPermission = !!data;
      
      // Cache result for 5 minutes
      await setCachedPermission(cacheKey, hasPermission, 300);
      
      return hasPermission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  });
}
```

## 4. Authentication Pattern (MANDATORY)

**Pattern**: `authenticateWithTenant`
**Target**: <200ms for authentication operations

```typescript
// MANDATORY: Use for ALL authentication with performance measurement
export async function authenticateWithTenant(
  email: string,
  password: string,
  tenantId?: string
): Promise<StandardResult<AuthenticatedUser>> {
  return await measureAPICall('authentication', async () => {
    try {
      // Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError || !authData.user) {
        return { success: false, error: 'Authentication failed', code: 'AUTH_FAILED' };
      }
      
      // Set tenant context if provided
      if (tenantId) {
        const tenantService = SharedTenantContextService.getInstance();
        const hasAccess = await tenantService.validateTenantAccess(authData.user.id, tenantId);
        
        if (!hasAccess) {
          return { success: false, error: 'No access to tenant', code: 'TENANT_ACCESS_DENIED' };
        }
        
        await tenantService.setTenantContext(tenantId);
      }
      
      return {
        success: true,
        data: {
          user: authData.user,
          session: authData.session,
          tenantId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication error',
        code: 'AUTH_ERROR'
      };
    }
  });
}
```

## 5. Audit Logging Pattern (MANDATORY)

**Pattern**: `logAuditEvent`
**Target**: <5ms for audit log writes

```typescript
// MANDATORY: Use for ALL audit logging with performance measurement
export async function logAuditEvent(
  eventType: string,
  eventData: AuditEventData
): Promise<void> {
  await measureAuditWrite(`audit_${eventType}`, async () => {
    try {
      const tenantService = SharedTenantContextService.getInstance();
      const tenantId = tenantService.getCurrentTenantId();
      
      const auditEntry = {
        tenant_id: tenantId,
        user_id: eventData.userId,
        event_type: eventType,
        action: eventData.action,
        resource_type: eventData.resourceType,
        resource_id: eventData.resourceId,
        metadata: eventData.metadata || {},
        timestamp: new Date().toISOString(),
        ip_address: eventData.ipAddress,
        user_agent: eventData.userAgent
      };
      
      // Asynchronous audit logging for performance
      supabase.from('audit_logs').insert(auditEntry);
      
      return { success: true };
    } catch (error) {
      console.error('Audit logging failed:', error);
      return { success: false };
    }
  });
}
```

## 6. Standard Result Pattern (MANDATORY)

**Pattern**: `StandardResult<T>`
**Target**: Consistent error handling

```typescript
// MANDATORY: Use this for ALL async operations
export interface StandardResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
```

## 7. Error Handling Pattern (MANDATORY)

**Pattern**: `handleError`
**Target**: Consistent error reporting

```typescript
// MANDATORY: Use this for ALL error handling
export function handleError(error: any, message: string = 'An unexpected error occurred'): StandardResult<null> {
  console.error(message, error);
  
  let errorMessage = message;
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  return {
    success: false,
    error: errorMessage,
    code: 'UNEXPECTED_ERROR'
  };
}
```

## Performance Integration Requirements

**ALL shared patterns MUST**:
1. Use performance measurement utilities
2. Meet the specific performance targets
3. Provide performance feedback during development
4. Integrate with automated performance validation

**Failure to meet performance targets will block phase progression.**

## Pattern Validation Checklist

Before using any shared pattern, verify:
- [ ] Performance measurement is included
- [ ] Target response times are met
- [ ] Error handling follows StandardResult<T>
- [ ] Tenant isolation is maintained
- [ ] Audit logging is included where required

## Related Documentation

- **[PERFORMANCE_MEASUREMENT_INFRASTRUCTURE.md](PERFORMANCE_MEASUREMENT_INFRASTRUCTURE.md)**: Performance measurement system
- **[performance/DATABASE_MEASUREMENT_UTILITIES.md](performance/DATABASE_MEASUREMENT_UTILITIES.md)**: Database performance utilities
- **[../PERFORMANCE_STANDARDS.md](../PERFORMANCE_STANDARDS.md)**: Performance targets

## Version History

- **2.0.0**: Added mandatory performance measurement integration (2025-05-23)
- **1.0.0**: Initial shared patterns for cross-phase consistency (2025-05-23)
