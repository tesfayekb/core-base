
import { PerformanceMeasurement } from './PerformanceMeasurement';

export class DatabaseMeasurementUtilities {
  private static measurement = PerformanceMeasurement.getInstance();
  
  // MANDATORY: Use for all tenant-filtered queries
  static async measureTenantQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>
  ): Promise<T> {
    const result = await this.measurement.measureOperation('simpleQuery', queryFunction);
    
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
    const result = await this.measurement.measureOperation('permissionCheck', queryFunction);
    
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
    const result = await this.measurement.measureOperation('auditWrite', writeFunction);
    
    if (!result.success) {
      throw new Error(`Audit write failed: ${result.error}`);
    }
    
    if (!result.validation.passed) {
      console.warn(`⚠️ Audit write too slow for ${auditType}:`, result.validation);
    }
    
    return result.data!;
  }

  // MANDATORY: Use for authentication operations
  static async measureAuthOperation<T>(
    operationType: string,
    authFunction: () => Promise<T>
  ): Promise<T> {
    const result = await this.measurement.measureOperation('authentication', authFunction);
    
    if (!result.success) {
      throw new Error(`Authentication operation failed: ${result.error}`);
    }
    
    if (!result.validation.passed) {
      console.warn(`⚠️ Authentication too slow for ${operationType}:`, result.validation);
    }
    
    return result.data!;
  }
}

// Convenience exports
export const measureTenantQuery = DatabaseMeasurementUtilities.measureTenantQuery;
export const measurePermissionQuery = DatabaseMeasurementUtilities.measurePermissionQuery;
export const measureAuditWrite = DatabaseMeasurementUtilities.measureAuditWrite;
export const measureAuthOperation = DatabaseMeasurementUtilities.measureAuthOperation;
