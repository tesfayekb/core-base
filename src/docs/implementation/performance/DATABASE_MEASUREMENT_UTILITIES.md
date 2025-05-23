
# Database Performance Measurement Utilities

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Specialized utilities for measuring database performance with specific targets from [../../PERFORMANCE_STANDARDS.md](../../PERFORMANCE_STANDARDS.md).

## Core Database Measurement Functions

```typescript
import { DatabasePerformanceMeasurement } from '../PERFORMANCE_MEASUREMENT_INFRASTRUCTURE';

export class DatabaseMeasurementUtilities {
  private static dbMeasurement = DatabasePerformanceMeasurement.getInstance();
  
  // MANDATORY: Use for all tenant-filtered queries
  static async measureTenantQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>
  ): Promise<T> {
    const result = await this.dbMeasurement.measureQuery('simple', queryFunction);
    
    if (!result.success) {
      throw new Error(`Database query failed: ${result.error}`);
    }
    
    if (!result.validation.passed) {
      console.warn(`⚠️ Query performance target missed for ${queryName}:`, result.validation);
    }
    
    return result.data!;
  }
  
  // MANDATORY: Use for permission resolution queries
  static async measurePermissionQuery<T>(
    permissionType: string,
    queryFunction: () => Promise<T>
  ): Promise<T> {
    const result = await this.dbMeasurement.measurePermissionCheck(queryFunction);
    
    if (!result.success) {
      throw new Error(`Permission query failed: ${result.error}`);
    }
    
    if (!result.validation.passed) {
      console.warn(`⚠️ Permission check too slow for ${permissionType}:`, result.validation);
    }
    
    return result.data!;
  }
  
  // MANDATORY: Use for audit log writes
  static async measureAuditWrite<T>(
    auditType: string,
    writeFunction: () => Promise<T>
  ): Promise<T> {
    const result = await this.dbMeasurement.measureQuery('simple', writeFunction);
    
    if (!result.success) {
      throw new Error(`Audit write failed: ${result.error}`);
    }
    
    if (!result.validation.passed) {
      console.warn(`⚠️ Audit write too slow for ${auditType}:`, result.validation);
    }
    
    return result.data!;
  }
  
  // MANDATORY: Use for complex joins and aggregations
  static async measureComplexQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>
  ): Promise<T> {
    const result = await this.dbMeasurement.measureQuery('complex', queryFunction);
    
    if (!result.success) {
      throw new Error(`Complex query failed: ${result.error}`);
    }
    
    if (!result.validation.passed) {
      console.warn(`⚠️ Complex query too slow for ${queryName}:`, result.validation);
    }
    
    return result.data!;
  }
}

// Convenience functions for common patterns
export const measureTenantQuery = DatabaseMeasurementUtilities.measureTenantQuery;
export const measurePermissionQuery = DatabaseMeasurementUtilities.measurePermissionQuery;
export const measureAuditWrite = DatabaseMeasurementUtilities.measureAuditWrite;
export const measureComplexQuery = DatabaseMeasurementUtilities.measureComplexQuery;
```

## Usage Examples

### Simple Tenant Query
```typescript
import { measureTenantQuery } from './performance/DATABASE_MEASUREMENT_UTILITIES';

// MANDATORY: All tenant queries must be measured
const users = await measureTenantQuery('get_tenant_users', async () => {
  return await supabase
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId);
});
```

### Permission Check
```typescript
import { measurePermissionQuery } from './performance/DATABASE_MEASUREMENT_UTILITIES';

// MANDATORY: All permission checks must be measured
const hasPermission = await measurePermissionQuery('user_view_permission', async () => {
  return await supabase.rpc('check_user_permission', {
    p_user_id: userId,
    p_action: 'view',
    p_resource: 'users'
  });
});
```

### Audit Log Write
```typescript
import { measureAuditWrite } from './performance/DATABASE_MEASUREMENT_UTILITIES';

// MANDATORY: All audit writes must be measured
await measureAuditWrite('user_login_audit', async () => {
  return await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action: 'login',
      timestamp: new Date(),
      metadata: { ip_address: userIP }
    });
});
```

## Related Documentation

- **[../PERFORMANCE_MEASUREMENT_INFRASTRUCTURE.md](../PERFORMANCE_MEASUREMENT_INFRASTRUCTURE.md)**: Core infrastructure
- **[../../PERFORMANCE_STANDARDS.md](../../PERFORMANCE_STANDARDS.md)**: Performance targets

## Version History

- **1.0.0**: Initial database measurement utilities (2025-05-23)
