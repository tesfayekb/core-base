
// Real-World Performance Validator
// Tests actual database performance with real queries and connections

import { supabase } from '../../services/database/connection';
import { rbacService } from '../../services/rbac/rbacService';
import { PerformanceMeasurement } from '../../services/performance/PerformanceMeasurement';

export interface RealWorldPerformanceResult {
  testName: string;
  duration: number;
  target: number;
  passed: boolean;
  details: Record<string, any>;
}

export interface PerformanceValidationReport {
  overallScore: number;
  targetsMet: number;
  totalTests: number;
  results: RealWorldPerformanceResult[];
  recommendations: string[];
}

export class RealWorldPerformanceValidator {
  private performanceMeasurement = PerformanceMeasurement.getInstance();
  private testResults: RealWorldPerformanceResult[] = [];

  async validateRealWorldPerformance(): Promise<PerformanceValidationReport> {
    console.log('🚀 Starting Real-World Performance Validation...');
    
    this.testResults = [];

    // Test 1: Real Database Connection Performance
    await this.testDatabaseConnectionPerformance();

    // Test 2: Real Permission Check Performance  
    await this.testRealPermissionCheckPerformance();

    // Test 3: Real Multi-Tenant Query Performance
    await this.testMultiTenantQueryPerformance();

    // Test 4: Real Audit Logging Performance
    await this.testAuditLoggingPerformance();

    // Test 5: Concurrent Real Operations Performance
    await this.testConcurrentOperationsPerformance();

    return this.generateValidationReport();
  }

  private async testDatabaseConnectionPerformance(): Promise<void> {
    const testName = 'Real Database Connection';
    const target = 100; // 100ms target

    try {
      const result = await this.performanceMeasurement.measureOperation(
        'connectionPoolAcquire',
        async () => {
          const { data, error } = await supabase
            .from('tenants')
            .select('id')
            .limit(1);
          
          if (error) throw error;
          return data;
        }
      );

      this.testResults.push({
        testName,
        duration: result.duration,
        target,
        passed: result.validation.passed,
        details: {
          connectionAcquired: result.success,
          validationDetails: result.validation
        }
      });
    } catch (error) {
      this.testResults.push({
        testName,
        duration: 0,
        target,
        passed: false,
        details: { error: error.message }
      });
    }
  }

  private async testRealPermissionCheckPerformance(): Promise<void> {
    const testName = 'Real Permission Check';
    const target = 15; // 15ms target for permission checks

    try {
      const result = await this.performanceMeasurement.measureOperation(
        'permissionCheck',
        async () => {
          return await rbacService.checkPermission(
            'test-user-id',
            'read',
            'documents',
            { tenantId: 'test-tenant' }
          );
        }
      );

      this.testResults.push({
        testName,
        duration: result.duration,
        target,
        passed: result.validation.passed,
        details: {
          permissionGranted: result.data,
          validationDetails: result.validation
        }
      });
    } catch (error) {
      this.testResults.push({
        testName,
        duration: 0,
        target,
        passed: false,
        details: { error: error.message }
      });
    }
  }

  private async testMultiTenantQueryPerformance(): Promise<void> {
    const testName = 'Multi-Tenant Query Performance';
    const target = 20; // 20ms target

    try {
      const result = await this.performanceMeasurement.measureOperation(
        'tenantIsolation',
        async () => {
          const { data, error } = await supabase
            .from('users')
            .select('id, email')
            .eq('tenant_id', 'test-tenant')
            .limit(10);
          
          if (error) throw error;
          return data;
        }
      );

      this.testResults.push({
        testName,
        duration: result.duration,
        target,
        passed: result.validation.passed,
        details: {
          recordsReturned: result.data?.length || 0,
          validationDetails: result.validation
        }
      });
    } catch (error) {
      this.testResults.push({
        testName,
        duration: 0,
        target,
        passed: false,
        details: { error: error.message }
      });
    }
  }

  private async testAuditLoggingPerformance(): Promise<void> {
    const testName = 'Real Audit Logging';
    const target = 5; // 5ms target for audit writes

    try {
      const result = await this.performanceMeasurement.measureOperation(
        'auditWrite',
        async () => {
          const { data, error } = await supabase.rpc('log_audit_event', {
            p_event_type: 'USER_ACTION',
            p_action: 'performance_test',
            p_resource_type: 'test',
            p_details: { test: true }
          });
          
          if (error) throw error;
          return data;
        }
      );

      this.testResults.push({
        testName,
        duration: result.duration,
        target,
        passed: result.validation.passed,
        details: {
          auditId: result.data,
          validationDetails: result.validation
        }
      });
    } catch (error) {
      this.testResults.push({
        testName,
        duration: 0,
        target,
        passed: false,
        details: { error: error.message }
      });
    }
  }

  private async testConcurrentOperationsPerformance(): Promise<void> {
    const testName = 'Concurrent Operations Performance';
    const target = 100; // 100ms target for 10 concurrent operations

    try {
      const startTime = performance.now();
      
      // Execute 10 concurrent permission checks
      const operations = Array.from({ length: 10 }, (_, i) =>
        rbacService.checkPermission(
          `test-user-${i}`,
          'read',
          'documents',
          { tenantId: 'test-tenant' }
        )
      );

      const results = await Promise.allSettled(operations);
      const duration = performance.now() - startTime;

      const successCount = results.filter(r => r.status === 'fulfilled').length;

      this.testResults.push({
        testName,
        duration,
        target,
        passed: duration <= target,
        details: {
          concurrentOperations: 10,
          successfulOperations: successCount,
          averageOperationTime: duration / 10
        }
      });
    } catch (error) {
      this.testResults.push({
        testName,
        duration: 0,
        target,
        passed: false,
        details: { error: error.message }
      });
    }
  }

  private generateValidationReport(): PerformanceValidationReport {
    const totalTests = this.testResults.length;
    const targetsMet = this.testResults.filter(r => r.passed).length;
    const overallScore = Math.round((targetsMet / totalTests) * 100);

    const recommendations: string[] = [];

    // Generate recommendations based on failed tests
    this.testResults.forEach(result => {
      if (!result.passed) {
        if (result.testName.includes('Database Connection')) {
          recommendations.push('Optimize database connection pool configuration');
        } else if (result.testName.includes('Permission Check')) {
          recommendations.push('Implement permission caching to achieve <15ms target');
        } else if (result.testName.includes('Multi-Tenant')) {
          recommendations.push('Add database indexes for tenant-specific queries');
        } else if (result.testName.includes('Audit')) {
          recommendations.push('Consider async audit logging for better performance');
        } else if (result.testName.includes('Concurrent')) {
          recommendations.push('Optimize concurrent operation handling');
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('All performance targets met - system ready for production');
    }

    return {
      overallScore,
      targetsMet,
      totalTests,
      results: this.testResults,
      recommendations
    };
  }
}
