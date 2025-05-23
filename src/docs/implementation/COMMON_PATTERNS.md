
# Common Implementation Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Error Handling Patterns

### Authentication Integration
```typescript
// Standard auth pattern with error handling
try {
  const { data, error } = await supabase.auth.signIn({
    email,
    password
  });
  
  if (error) {
    handleAuthError(error);
    return;
  }
  
  // Set tenant context after successful auth
  await setTenantContext(data.user.id);
  
} catch (error) {
  logError('Auth integration failed', error);
  showUserError('Authentication failed. Please try again.');
}
```

### RBAC Permission Checks
```typescript
// Standard permission check with validation
async function checkPermissionWithValidation(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string
): Promise<boolean> {
  try {
    // Validate inputs
    if (!userId || !action || !resource) {
      throw new Error('Missing required permission check parameters');
    }
    
    // Check permission with dependency resolution
    const hasPermission = await permissionService.check({
      userId,
      action,
      resource,
      resourceId
    });
    
    // Log for audit
    await auditLog({
      action: 'permission_check',
      userId,
      resource,
      result: hasPermission
    });
    
    return hasPermission;
    
  } catch (error) {
    logError('Permission check failed', error);
    return false; // Deny on error
  }
}
```

## Multi-Tenant Data Access

### Tenant-Aware Query Pattern
```typescript
// Standard tenant-aware query pattern
async function getTenantData<T>(
  tableName: string,
  filters: Record<string, any> = {}
): Promise<T[]> {
  try {
    // Ensure tenant context is set
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant context available');
    }
    
    // Build query with tenant isolation
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .match(filters);
      
    if (error) {
      throw error;
    }
    
    return data as T[];
    
  } catch (error) {
    logError(`Failed to fetch ${tableName} data`, error);
    throw new Error(`Data access failed for ${tableName}`);
  }
}
```

## Error Management Strategy

### Centralized Error Handling
```typescript
// Centralized error handling
class IntegrationError extends Error {
  constructor(
    message: string,
    public component: string,
    public context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

function handleIntegrationError(error: Error, component: string) {
  logError(`${component} integration error`, error);
  
  if (error instanceof IntegrationError) {
    // Handle known integration issues
    showUserError(error.message);
  } else {
    // Handle unexpected errors
    showUserError('An unexpected error occurred. Please try again.');
  }
}
```

## Performance Monitoring

### Operation Tracking
```typescript
// Performance tracking for integrations
async function withPerformanceTracking<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    // Log performance metrics
    logPerformance(operationName, duration);
    
    // Alert if operation exceeds thresholds
    if (duration > PERFORMANCE_THRESHOLDS[operationName]) {
      alertSlowOperation(operationName, duration);
    }
    
    return result;
    
  } catch (error) {
    const duration = performance.now() - startTime;
    logError(`${operationName} failed after ${duration}ms`, error);
    throw error;
  }
}
```

## Version History

- **1.0.0**: Initial common patterns guide (2025-05-23)
