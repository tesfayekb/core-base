# Performance Measurement Infrastructure

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This infrastructure provides automated performance measurement and validation capabilities to ensure all implemented features meet the specific performance targets defined in [../PERFORMANCE_STANDARDS.md](../PERFORMANCE_STANDARDS.md).

## MANDATORY: Performance Validation During Implementation

**BEFORE implementing ANY feature**, AI MUST use the performance measurement infrastructure to validate that implementation meets performance targets.

```typescript
import { PerformanceMeasurement } from './performance/PerformanceMeasurement';

// MANDATORY: Measure performance for any new implementation
const measurement = new PerformanceMeasurement();
await measurement.validateImplementation('feature_name', async () => {
  // Implementation code here
});
```

## Core Performance Measurement Classes

### PerformanceMeasurement Class

```typescript
export class PerformanceMeasurement {
  private static instance: PerformanceMeasurement;
  private measurements: Map<string, PerformanceMetric[]> = new Map();
  
  static getInstance(): PerformanceMeasurement {
    if (!PerformanceMeasurement.instance) {
      PerformanceMeasurement.instance = new PerformanceMeasurement();
    }
    return PerformanceMeasurement.instance;
  }
  
  // Measure and validate any operation against performance targets
  async validateImplementation<T>(
    operationName: string,
    operation: () => Promise<T>,
    expectedTarget?: number
  ): Promise<ValidationResult<T>> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      const memoryUsed = this.getMemoryUsage() - startMemory;
      
      const metric: PerformanceMetric = {
        operationName,
        duration,
        memoryUsed,
        timestamp: new Date(),
        success: true
      };
      
      this.recordMeasurement(operationName, metric);
      
      const validation = this.validateAgainstTargets(operationName, metric, expectedTarget);
      
      if (!validation.passed) {
        console.warn(`⚠️ Performance target missed for ${operationName}:`, validation);
      } else {
        console.log(`✅ Performance target met for ${operationName}: ${duration.toFixed(2)}ms`);
      }
      
      return {
        success: true,
        data: result,
        performanceMetric: metric,
        validation
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const metric: PerformanceMetric = {
        operationName,
        duration,
        memoryUsed: 0,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.recordMeasurement(operationName, metric);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performanceMetric: metric,
        validation: { passed: false, message: 'Operation failed', target: 0, actual: duration }
      };
    }
  }
  
  private validateAgainstTargets(
    operationName: string,
    metric: PerformanceMetric,
    expectedTarget?: number
  ): PerformanceValidation {
    const target = expectedTarget || this.getPerformanceTarget(operationName);
    const passed = metric.duration <= target;
    
    return {
      passed,
      target,
      actual: metric.duration,
      message: passed 
        ? `Performance target met: ${metric.duration.toFixed(2)}ms <= ${target}ms`
        : `Performance target missed: ${metric.duration.toFixed(2)}ms > ${target}ms`
    };
  }
  
  private getPerformanceTarget(operationName: string): number {
    const targets: Record<string, number> = {
      'permission_check': 15,           // 15ms target
      'database_query_simple': 10,      // 10ms target
      'database_query_complex': 50,     // 50ms target
      'authentication': 200,            // 200ms target
      'tenant_isolation': 20,           // 20ms target
      'cache_operation': 5,             // 5ms target
      'audit_log_write': 5,            // 5ms target
      'api_response': 250,              // 250ms target
      'dashboard_load': 2000,           // 2s target
      'ui_render': 300                  // 300ms target
    };
    
    return targets[operationName] || 100; // Default 100ms if not specified
  }
  
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
  
  private recordMeasurement(operationName: string, metric: PerformanceMetric): void {
    if (!this.measurements.has(operationName)) {
      this.measurements.set(operationName, []);
    }
    
    const measurements = this.measurements.get(operationName)!;
    measurements.push(metric);
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }
  }
  
  // Get performance analytics for an operation
  getAnalytics(operationName: string): PerformanceAnalytics | null {
    const measurements = this.measurements.get(operationName);
    if (!measurements || measurements.length === 0) return null;
    
    const durations = measurements.map(m => m.duration);
    const successfulMeasurements = measurements.filter(m => m.success);
    
    return {
      operationName,
      totalMeasurements: measurements.length,
      successRate: (successfulMeasurements.length / measurements.length) * 100,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: this.calculatePercentile(durations, 95),
      target: this.getPerformanceTarget(operationName),
      targetMissRate: (measurements.filter(m => 
        m.duration > this.getPerformanceTarget(operationName)
      ).length / measurements.length) * 100
    };
  }
  
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}

export interface PerformanceMetric {
  operationName: string;
  duration: number;
  memoryUsed: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface PerformanceValidation {
  passed: boolean;
  target: number;
  actual: number;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  performanceMetric: PerformanceMetric;
  validation: PerformanceValidation;
}

export interface PerformanceAnalytics {
  operationName: string;
  totalMeasurements: number;
  successRate: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  target: number;
  targetMissRate: number;
}
```

## Database Performance Measurement

```typescript
export class DatabasePerformanceMeasurement {
  private static instance: DatabasePerformanceMeasurement;
  private performanceMeasurement = PerformanceMeasurement.getInstance();
  
  static getInstance(): DatabasePerformanceMeasurement {
    if (!DatabasePerformanceMeasurement.instance) {
      DatabasePerformanceMeasurement.instance = new DatabasePerformanceMeasurement();
    }
    return DatabasePerformanceMeasurement.instance;
  }
  
  // MANDATORY: Use for all database queries
  async measureQuery<T>(
    queryType: 'simple' | 'complex' | 'permission' | 'audit',
    queryFunction: () => Promise<T>
  ): Promise<ValidationResult<T>> {
    const operationName = `database_query_${queryType}`;
    
    return await this.performanceMeasurement.validateImplementation(
      operationName,
      queryFunction
    );
  }
  
  // Measure specific database operations
  async measureTenantIsolation<T>(operation: () => Promise<T>): Promise<ValidationResult<T>> {
    return await this.performanceMeasurement.validateImplementation(
      'tenant_isolation',
      operation,
      20 // 20ms target for tenant isolation
    );
  }
  
  async measurePermissionCheck<T>(operation: () => Promise<T>): Promise<ValidationResult<T>> {
    return await this.performanceMeasurement.validateImplementation(
      'permission_check',
      operation,
      15 // 15ms target for permission checks
    );
  }
}
```

## API Performance Measurement

```typescript
export class APIPerformanceMeasurement {
  private static instance: APIPerformanceMeasurement;
  private performanceMeasurement = PerformanceMeasurement.getInstance();
  
  static getInstance(): APIPerformanceMeasurement {
    if (!APIPerformanceMeasurement.instance) {
      APIPerformanceMeasurement.instance = new APIPerformanceMeasurement();
    }
    return APIPerformanceMeasurement.instance;
  }
  
  // MANDATORY: Use for all API endpoints
  async measureAPICall<T>(
    endpoint: string,
    apiFunction: () => Promise<T>,
    expectedResponseTime?: number
  ): Promise<ValidationResult<T>> {
    return await this.performanceMeasurement.validateImplementation(
      `api_${endpoint}`,
      apiFunction,
      expectedResponseTime || 250 // Default 250ms for API calls
    );
  }
  
  // Measure authentication operations
  async measureAuthentication<T>(operation: () => Promise<T>): Promise<ValidationResult<T>> {
    return await this.performanceMeasurement.validateImplementation(
      'authentication',
      operation,
      200 // 200ms target for authentication
    );
  }
}
```

## UI Performance Measurement

```typescript
export class UIPerformanceMeasurement {
  private static instance: UIPerformanceMeasurement;
  private performanceMeasurement = PerformanceMeasurement.getInstance();
  
  static getInstance(): UIPerformanceMeasurement {
    if (!UIPerformanceMeasurement.instance) {
      UIPerformanceMeasurement.instance = new UIPerformanceMeasurement();
    }
    return UIPerformanceMeasurement.instance;
  }
  
  // MANDATORY: Use for UI component rendering
  async measureComponentRender<T>(
    componentName: string,
    renderFunction: () => Promise<T>
  ): Promise<ValidationResult<T>> {
    return await this.performanceMeasurement.validateImplementation(
      `ui_render_${componentName}`,
      renderFunction,
      300 // 300ms target for UI rendering
    );
  }
  
  // Measure dashboard loading
  async measureDashboardLoad<T>(operation: () => Promise<T>): Promise<ValidationResult<T>> {
    return await this.performanceMeasurement.validateImplementation(
      'dashboard_load',
      operation,
      2000 // 2s target for dashboard loading
    );
  }
  
  // Measure Core Web Vitals
  async measureWebVitals(): Promise<WebVitalsMetrics> {
    return new Promise((resolve) => {
      const metrics: Partial<WebVitalsMetrics> = {};
      
      // Measure FCP
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navigationEntries.length > 0) {
          const navEntry = navigationEntries[0];
          metrics.fcp = navEntry.domContentLoadedEventEnd - navEntry.fetchStart;
        }
      }
      
      // Use Web Vitals library if available
      if (typeof window !== 'undefined' && 'webVitals' in window) {
        // Implementation would use actual web-vitals library
        // This is a placeholder for the concept
      }
      
      resolve(metrics as WebVitalsMetrics);
    });
  }
}

export interface WebVitalsMetrics {
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
  tti: number;
  tbt: number;
}
```

## Implementation Usage Examples

### Database Query Example
```typescript
// MANDATORY: All database queries must be measured
const dbMeasurement = DatabasePerformanceMeasurement.getInstance();

const result = await dbMeasurement.measureQuery('simple', async () => {
  return await supabase
    .from('users')
    .select('id, email')
    .eq('tenant_id', tenantId)
    .limit(10);
});

if (!result.validation.passed) {
  console.error('Database query performance target missed:', result.validation);
}
```

### Permission Check Example
```typescript
// MANDATORY: All permission checks must be measured
const dbMeasurement = DatabasePerformanceMeasurement.getInstance();

const permissionResult = await dbMeasurement.measurePermissionCheck(async () => {
  return await checkPermission(userId, 'view', 'users');
});

if (!permissionResult.validation.passed) {
  console.error('Permission check too slow:', permissionResult.validation);
}
```

### API Endpoint Example
```typescript
// MANDATORY: All API calls must be measured
const apiMeasurement = APIPerformanceMeasurement.getInstance();

const apiResult = await apiMeasurement.measureAPICall('user_profile', async () => {
  return await fetch('/api/user/profile');
});

if (!apiResult.validation.passed) {
  console.error('API response too slow:', apiResult.validation);
}
```

## Performance Reporting Dashboard

```typescript
export class PerformanceReportingDashboard {
  private performanceMeasurement = PerformanceMeasurement.getInstance();
  
  // Generate performance report for all operations
  generateReport(): PerformanceReport {
    const operations = [
      'permission_check',
      'database_query_simple',
      'database_query_complex',
      'authentication',
      'tenant_isolation',
      'api_response',
      'dashboard_load'
    ];
    
    const analytics = operations.map(op => 
      this.performanceMeasurement.getAnalytics(op)
    ).filter(Boolean) as PerformanceAnalytics[];
    
    return {
      timestamp: new Date(),
      totalOperations: analytics.length,
      overallHealth: this.calculateOverallHealth(analytics),
      operationAnalytics: analytics,
      recommendations: this.generateRecommendations(analytics)
    };
  }
  
  private calculateOverallHealth(analytics: PerformanceAnalytics[]): PerformanceHealth {
    const totalOperations = analytics.reduce((sum, a) => sum + a.totalMeasurements, 0);
    const totalTargetMisses = analytics.reduce((sum, a) => 
      sum + (a.totalMeasurements * a.targetMissRate / 100), 0
    );
    
    const overallTargetMissRate = (totalTargetMisses / totalOperations) * 100;
    
    return {
      score: Math.max(0, 100 - overallTargetMissRate),
      status: overallTargetMissRate < 5 ? 'healthy' : 
              overallTargetMissRate < 15 ? 'warning' : 'critical',
      targetMissRate: overallTargetMissRate
    };
  }
  
  private generateRecommendations(analytics: PerformanceAnalytics[]): string[] {
    const recommendations: string[] = [];
    
    analytics.forEach(metric => {
      if (metric.targetMissRate > 10) {
        recommendations.push(
          `Optimize ${metric.operationName}: ${metric.targetMissRate.toFixed(1)}% of operations exceed target`
        );
      }
      
      if (metric.p95Duration > metric.target * 2) {
        recommendations.push(
          `Address performance spikes in ${metric.operationName}: P95 is ${metric.p95Duration.toFixed(1)}ms`
        );
      }
    });
    
    return recommendations;
  }
}

export interface PerformanceReport {
  timestamp: Date;
  totalOperations: number;
  overallHealth: PerformanceHealth;
  operationAnalytics: PerformanceAnalytics[];
  recommendations: string[];
}

export interface PerformanceHealth {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  targetMissRate: number;
}
```

## MANDATORY Implementation Guidelines

1. **All Database Operations**: Must use `DatabasePerformanceMeasurement`
2. **All API Calls**: Must use `APIPerformanceMeasurement`
3. **All UI Rendering**: Must use `UIPerformanceMeasurement`
4. **All Permission Checks**: Must be measured with 15ms target
5. **All Tenant Operations**: Must validate 20ms isolation target

## Integration with Existing Systems

This infrastructure integrates with:
- **Phase Enforcement System**: Performance validation before phase completion
- **Shared Patterns**: All shared patterns must include performance measurement
- **Testing Framework**: Automated performance testing in CI/CD

## Success Criteria

✅ All operations measured against specific targets  
✅ Real-time performance validation during implementation  
✅ Automated performance reporting and alerts  
✅ Integration with all phases and patterns  
✅ Clear performance feedback for AI implementation  

## Related Documentation

- **[../PERFORMANCE_STANDARDS.md](../PERFORMANCE_STANDARDS.md)**: Specific performance targets
- **[SHARED_PATTERNS.md](SHARED_PATTERNS.md)**: Shared patterns with performance measurement
- **[PHASE_ENFORCEMENT_SYSTEM.md](PHASE_ENFORCEMENT_SYSTEM.md)**: Phase validation system

## Version History

- **1.0.0**: Initial performance measurement infrastructure (2025-05-23)
