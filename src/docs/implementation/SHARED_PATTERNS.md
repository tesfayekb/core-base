
# Shared Implementation Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

**CRITICAL**: This document defines patterns that MUST be used consistently across ALL phases. Any implementation that deviates from these patterns will cause integration failures.

## Tenant Isolation Pattern (ALL PHASES)

### Database Query Pattern
```typescript
// MANDATORY: Use this exact pattern for ALL tenant-aware queries
async function executeTenantQuery<T>(
  tableName: string,
  operation: 'select' | 'insert' | 'update' | 'delete',
  data?: any,
  filters?: Record<string, any>
): Promise<StandardResult<T>> {
  try {
    // 1. ALWAYS verify tenant context first
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return { success: false, error: 'No tenant context', code: 'NO_TENANT_CONTEXT' };
    }

    // 2. ALWAYS set tenant context in database session
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });

    // 3. Execute operation with tenant filter
    let query = supabase.from(tableName);
    
    switch (operation) {
      case 'select':
        query = query.select('*').eq('tenant_id', tenantId);
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        break;
        
      case 'insert':
        query = query.insert({ ...data, tenant_id: tenantId });
        break;
        
      case 'update':
        query = query.update(data).eq('tenant_id', tenantId);
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        break;
        
      case 'delete':
        query = query.delete().eq('tenant_id', tenantId);
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        break;
    }

    const { data: result, error } = await query;
    
    if (error) {
      return { success: false, error: error.message, code: 'DATABASE_ERROR' };
    }
    
    return { success: true, data: result as T };
  } catch (error) {
    console.error('Tenant query error:', error);
    return { success: false, error: 'Query execution failed', code: 'EXECUTION_ERROR' };
  }
}
```

### Tenant Context Service (SHARED ACROSS ALL PHASES)
```typescript
// MANDATORY: Single tenant context service used by ALL components
export class SharedTenantContextService {
  private static instance: SharedTenantContextService;
  private currentTenantId: string | null = null;
  
  static getInstance(): SharedTenantContextService {
    if (!SharedTenantContextService.instance) {
      SharedTenantContextService.instance = new SharedTenantContextService();
    }
    return SharedTenantContextService.instance;
  }
  
  async getCurrentTenantId(): Promise<string | null> {
    if (this.currentTenantId) return this.currentTenantId;
    
    // Check session storage
    const stored = sessionStorage.getItem('current_tenant_id');
    if (stored) {
      this.currentTenantId = stored;
      return stored;
    }
    
    // Check user metadata
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.tenant_id) {
      this.currentTenantId = user.user_metadata.tenant_id;
      return this.currentTenantId;
    }
    
    return null;
  }
  
  async setCurrentTenant(tenantId: string): Promise<boolean> {
    try {
      // Set in session
      sessionStorage.setItem('current_tenant_id', tenantId);
      this.currentTenantId = tenantId;
      
      // Set database context
      await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
      
      // Notify components
      window.dispatchEvent(new CustomEvent('tenantChanged', { detail: tenantId }));
      
      return true;
    } catch (error) {
      console.error('Failed to set tenant context:', error);
      return false;
    }
  }
}

// MANDATORY: Use this function everywhere tenant ID is needed
export const getCurrentTenantId = async (): Promise<string | null> => {
  return SharedTenantContextService.getInstance().getCurrentTenantId();
};
```

## Permission Check Pattern (ALL PHASES)

### Unified Permission Check
```typescript
// MANDATORY: Use this exact pattern for ALL permission checks
export async function checkPermission(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string
): Promise<boolean> {
  try {
    // 1. Get tenant context
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return false;
    
    // 2. Check cache first
    const cacheKey = `perm:${userId}:${tenantId}:${resource}:${action}:${resourceId || 'any'}`;
    const cached = permissionCache.get(cacheKey);
    if (cached !== undefined) return cached;
    
    // 3. Check SuperAdmin
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
      user_id: userId
    });
    
    if (isSuperAdmin) {
      permissionCache.set(cacheKey, true, 300);
      return true;
    }
    
    // 4. Set tenant context and check permission
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
    
    const { data: hasPermission } = await supabase.rpc('check_user_permission', {
      user_id: userId,
      resource_type: resource,
      action_name: action,
      resource_id: resourceId
    });
    
    const result = hasPermission === true;
    permissionCache.set(cacheKey, result, 300);
    
    return result;
  } catch (error) {
    console.error('Permission check error:', error);
    return false; // Fail closed
  }
}
```

## Authentication Integration Pattern (ALL PHASES)

### Standard Auth Flow
```typescript
// MANDATORY: Use this exact authentication pattern
export async function authenticateWithTenant(
  email: string,
  password: string,
  tenantId?: string
): Promise<StandardResult<AuthResult>> {
  try {
    // 1. Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      return { success: false, error: authError.message, code: 'AUTH_FAILED' };
    }
    
    // 2. Determine tenant context
    const targetTenantId = tenantId || await getDefaultTenant(authData.user.id);
    if (!targetTenantId) {
      return { success: false, error: 'No tenant access', code: 'NO_TENANT_ACCESS' };
    }
    
    // 3. Set tenant context
    const tenantService = SharedTenantContextService.getInstance();
    const success = await tenantService.setCurrentTenant(targetTenantId);
    if (!success) {
      return { success: false, error: 'Failed to set tenant context', code: 'TENANT_CONTEXT_FAILED' };
    }
    
    // 4. Load permissions
    const permissions = await loadUserPermissions(authData.user.id, targetTenantId);
    
    return {
      success: true,
      data: {
        user: authData.user,
        session: authData.session,
        tenantId: targetTenantId,
        permissions
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed', code: 'EXECUTION_ERROR' };
  }
}
```

## Audit Logging Pattern (ALL PHASES)

### Standard Audit Event
```typescript
// MANDATORY: Use this exact pattern for ALL audit logging
interface StandardAuditEvent {
  eventType: string;
  userId: string;
  tenantId: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  status: 'success' | 'failed' | 'error';
  metadata?: Record<string, any>;
}

export async function logAuditEvent(
  eventType: string,
  data: Omit<StandardAuditEvent, 'eventType'>
): Promise<void> {
  try {
    // ALWAYS include tenant context in audit logs
    const tenantId = data.tenantId || await getCurrentTenantId();
    if (!tenantId) {
      console.error('Cannot log audit event without tenant context');
      return;
    }
    
    const auditEvent: StandardAuditEvent = {
      eventType,
      tenantId,
      ...data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'application',
        ...data.metadata
      }
    };
    
    // Log to audit table
    await supabase.from('audit_logs').insert({
      event_type: auditEvent.eventType,
      user_id: auditEvent.userId,
      tenant_id: auditEvent.tenantId,
      resource_type: auditEvent.resource,
      resource_id: auditEvent.resourceId,
      action: auditEvent.action,
      status: auditEvent.status,
      metadata: auditEvent.metadata,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // NEVER let audit logging break the main flow
    console.error('Audit logging error:', error);
  }
}
```

## Error Handling Pattern (ALL PHASES)

### Standard Error Response
```typescript
// MANDATORY: Use this exact error structure everywhere
export interface StandardError {
  success: false;
  error: string;
  code: string;
  details?: Record<string, any>;
}

export interface StandardSuccess<T> {
  success: true;
  data: T;
}

export type StandardResult<T> = StandardSuccess<T> | StandardError;

// MANDATORY: Use this for all async operations
export async function withStandardErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<StandardResult<T>> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(`${operationName} error:`, error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        code: 'OPERATION_ERROR'
      };
    }
    
    return {
      success: false,
      error: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR'
    };
  }
}
```

## Database Schema Patterns (ALL PHASES)

### Required Database Functions
```sql
-- MANDATORY: These functions MUST exist for all phases
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN nullif(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- MANDATORY: All tenant-scoped tables MUST have this policy
CREATE POLICY tenant_isolation_policy ON {table_name}
  FOR ALL
  USING (tenant_id = current_tenant_id());
```

## Critical Implementation Rules

1. **NEVER bypass tenant context** - All operations MUST include tenant validation
2. **ALWAYS use SharedTenantContextService** - No direct tenant ID access
3. **ALWAYS use checkPermission function** - No inline permission logic
4. **ALWAYS use StandardResult<T>** - No raw error throwing
5. **ALWAYS log audit events** - No operations without audit trail
6. **ALWAYS set database tenant context** - Before any database operation

## Phase-Specific Usage

### Phase 1: Foundation
- Implement SharedTenantContextService
- Create basic permission checking
- Establish database functions
- Set up audit logging foundation

### Phase 2: Core Features
- Use established patterns for advanced RBAC
- Extend audit logging with more event types
- Add tenant-aware user management

### Phase 3: Advanced Features
- Apply patterns to dashboard and monitoring
- Use audit patterns for security events
- Maintain consistency in UI components

### Phase 4: Production
- Ensure all patterns are optimized
- Add monitoring for pattern compliance
- Document any pattern deviations

## Validation

Before any phase implementation, verify:
- [ ] SharedTenantContextService is implemented
- [ ] Database functions exist
- [ ] Permission check function works
- [ ] Audit logging is functional
- [ ] Error handling follows StandardResult pattern

This ensures consistent implementation across all phases and prevents integration failures.
