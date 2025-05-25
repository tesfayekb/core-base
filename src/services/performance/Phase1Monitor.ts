
import { PerformanceMetrics, HealthStatus } from './PerformanceMetrics';

export class Phase1Monitor {
  private static instance: Phase1Monitor;
  private metrics: PerformanceMetrics = {};

  private constructor() {}

  static getInstance(): Phase1Monitor {
    if (!Phase1Monitor.instance) {
      Phase1Monitor.instance = new Phase1Monitor();
    }
    return Phase1Monitor.instance;
  }

  recordAPICall(endpoint: string, duration: number, success: boolean = true): void {
    const timestamp = Date.now();
    this.metrics.apiCalls = this.metrics.apiCalls || [];
    this.metrics.apiCalls.push({
      endpoint,
      duration,
      success,
      timestamp,
      calledAt: new Date()
    });

    console.log(`[Phase1Monitor] API call recorded: ${endpoint} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  recordCacheHit(cacheKey: string): void {
    this.metrics.cacheHits = this.metrics.cacheHits || 0;
    this.metrics.cacheHits++;
    console.log(`[Phase1Monitor] Cache hit recorded: ${cacheKey}`);
  }

  recordCacheMiss(cacheKey: string): void {
    this.metrics.cacheMisses = this.metrics.cacheMisses || 0;
    this.metrics.cacheMisses++;
    console.log(`[Phase1Monitor] Cache miss recorded: ${cacheKey}`);
  }

  recordDatabaseQuery(queryOrDuration: string | number, duration?: number, success: boolean = true): void {
    // Handle both old signature (duration) and new signature (query, duration)
    let query: string;
    let actualDuration: number;
    
    if (typeof queryOrDuration === 'string') {
      query = queryOrDuration;
      actualDuration = duration || 0;
    } else {
      query = 'unknown query';
      actualDuration = queryOrDuration;
    }

    this.metrics.databaseQueries = this.metrics.databaseQueries || [];
    this.metrics.databaseQueries.push({
      query,
      duration: actualDuration,
      success,
      timestamp: Date.now(),
      executedAt: new Date()
    });

    // Update aggregated database metrics
    this.updateDatabaseMetrics(actualDuration, success);
    
    console.log(`[Phase1Monitor] Database query recorded: ${query} - ${actualDuration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  recordExternalServiceCall(serviceName: string, duration: number, success: boolean = true): void {
    this.metrics.externalServiceCalls = this.metrics.externalServiceCalls || [];
    this.metrics.externalServiceCalls.push({
      serviceName,
      duration,
      success,
      timestamp: Date.now(),
      calledAt: new Date()
    });
    console.log(`[Phase1Monitor] External service call recorded: ${serviceName} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  recordUserLogin(userId: string, success: boolean = true): void {
    this.metrics.userLogins = this.metrics.userLogins || [];
    this.metrics.userLogins.push({
      userId,
      success,
      timestamp: Date.now(),
      loggedInAt: new Date()
    });
    console.log(`[Phase1Monitor] User login recorded: ${userId} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  recordDataIngestion(source: string, amount: number, success: boolean = true): void {
    this.metrics.dataIngestions = this.metrics.dataIngestions || [];
    this.metrics.dataIngestions.push({
      source,
      amount,
      success,
      timestamp: Date.now(),
      ingestedAt: new Date()
    });
    console.log(`[Phase1Monitor] Data ingestion recorded: ${source} - ${amount} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  recordSecurityEvent(eventType: string, details: string, severity: string): void {
    this.metrics.securityEvents = this.metrics.securityEvents || [];
    this.metrics.securityEvents.push({
      eventType,
      details,
      severity,
      timestamp: Date.now(),
      occurredAt: new Date()
    });
    console.log(`[Phase1Monitor] Security event recorded: ${eventType} - ${details} - ${severity}`);
  }

  recordResourceUsage(resourceType: string, usage: number, unit: string): void {
    this.metrics.resourceUsages = this.metrics.resourceUsages || [];
    this.metrics.resourceUsages.push({
      resourceType,
      usage,
      unit,
      timestamp: Date.now(),
      recordedAt: new Date()
    });
    console.log(`[Phase1Monitor] Resource usage recorded: ${resourceType} - ${usage} ${unit}`);
  }

  recordError(errorType: string, message: string, stackTrace?: string): void {
    this.metrics.errors = this.metrics.errors || [];
    this.metrics.errors.push({
      errorType,
      message,
      stackTrace,
      timestamp: Date.now(),
      occurredAt: new Date()
    });
    console.error(`[Phase1Monitor] Error recorded: ${errorType} - ${message}`);
    if (stackTrace) {
      console.error(stackTrace);
    }
  }

  recordCustomEvent(eventName: string, details: any): void {
    this.metrics.customEvents = this.metrics.customEvents || [];
    this.metrics.customEvents.push({
      eventName,
      details,
      timestamp: Date.now(),
      occurredAt: new Date()
    });
    console.log(`[Phase1Monitor] Custom event recorded: ${eventName} - ${JSON.stringify(details)}`);
  }

  recordCacheWarmup(success: boolean): void {
    this.metrics.cacheWarmups = this.metrics.cacheWarmups || [];
    this.metrics.cacheWarmups.push({
      success,
      timestamp: Date.now(),
      completedAt: new Date()
    });
    console.log(`[Phase1Monitor] Cache warmup recorded: ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  recordTaskCompletion(taskId: string, success: boolean = true): void {
    const timestamp = Date.now();
    
    // Record the task completion in metrics
    this.metrics.taskCompletions = this.metrics.taskCompletions || [];
    this.metrics.taskCompletions.push({
      taskId,
      success,
      timestamp,
      completedAt: new Date()
    });

    // Update overall completion tracking
    if (success) {
      this.metrics.completedTasks = (this.metrics.completedTasks || 0) + 1;
    }

    console.log(`[Phase1Monitor] Task ${taskId} completion recorded: ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  // New missing methods
  recordAuditEvent(duration: number): void {
    this.updateAuditMetrics(duration);
    console.log(`[Phase1Monitor] Audit event recorded: ${duration}ms`);
  }

  recordPermissionCheck(duration: number, success: boolean = true): void {
    this.updatePermissionMetrics(duration, success);
    console.log(`[Phase1Monitor] Permission check recorded: ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  recordTenantSwitch(duration: number): void {
    this.updateMultiTenantMetrics(duration);
    console.log(`[Phase1Monitor] Tenant switch recorded: ${duration}ms`);
  }

  recordDependencyResolution(count: number): void {
    this.updateDependencyMetrics(count);
    console.log(`[Phase1Monitor] Dependency resolution recorded: ${count} dependencies`);
  }

  reset(): void {
    this.metrics = {};
    console.log('[Phase1Monitor] Metrics reset');
  }

  resetMetrics(): void {
    this.reset();
  }

  getHealthStatus(): HealthStatus {
    const issues: string[] = [];
    let score = 100;

    // Check database performance
    if (this.metrics.database?.averageQueryTime && this.metrics.database.averageQueryTime > 50) {
      issues.push('Database queries are slow');
      score -= 20;
    }

    // Check permission performance
    if (this.metrics.permissions?.averageCheckTime && this.metrics.permissions.averageCheckTime > 15) {
      issues.push('Permission checks are slow');
      score -= 15;
    }

    // Check cache hit rate
    if (this.metrics.permissions?.cacheHitRate && this.metrics.permissions.cacheHitRate < 85) {
      issues.push('Low cache hit rate');
      score -= 10;
    }

    // Check tenant isolation
    if (this.metrics.multiTenant?.isolationViolations && this.metrics.multiTenant.isolationViolations > 0) {
      issues.push('Tenant isolation violations detected');
      score -= 30;
    }

    let status: 'excellent' | 'good' | 'warning' | 'critical';
    if (score >= 95) status = 'excellent';
    else if (score >= 80) status = 'good';
    else if (score >= 60) status = 'warning';
    else status = 'critical';

    return {
      status,
      score,
      issues,
      components: {
        database: this.metrics.database,
        permissions: this.metrics.permissions,
        multiTenant: this.metrics.multiTenant,
        audit: this.metrics.audit
      }
    };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Private helper methods
  private updateDatabaseMetrics(duration: number, success: boolean): void {
    if (!this.metrics.database) {
      this.metrics.database = {
        averageQueryTime: 0,
        totalQueries: 0,
        failedQueries: 0
      };
    }

    this.metrics.database.totalQueries++;
    if (!success) {
      this.metrics.database.failedQueries++;
    }

    // Update average query time
    const currentTotal = this.metrics.database.averageQueryTime * (this.metrics.database.totalQueries - 1);
    this.metrics.database.averageQueryTime = (currentTotal + duration) / this.metrics.database.totalQueries;
  }

  private updatePermissionMetrics(duration: number, success: boolean): void {
    if (!this.metrics.permissions) {
      this.metrics.permissions = {
        averageCheckTime: 0,
        cacheHitRate: 0,
        totalChecks: 0,
        failedChecks: 0
      };
    }

    this.metrics.permissions.totalChecks++;
    if (!success) {
      this.metrics.permissions.failedChecks++;
    }

    // Update average check time
    const currentTotal = this.metrics.permissions.averageCheckTime * (this.metrics.permissions.totalChecks - 1);
    this.metrics.permissions.averageCheckTime = (currentTotal + duration) / this.metrics.permissions.totalChecks;

    // Update cache hit rate (simplified calculation)
    const hits = this.metrics.cacheHits || 0;
    const misses = this.metrics.cacheMisses || 0;
    const total = hits + misses;
    this.metrics.permissions.cacheHitRate = total > 0 ? (hits / total) * 100 : 100;
  }

  private updateMultiTenantMetrics(duration: number): void {
    if (!this.metrics.multiTenant) {
      this.metrics.multiTenant = {
        averageSwitchTime: 0,
        isolationViolations: 0,
        totalSwitches: 0
      };
    }

    this.metrics.multiTenant.totalSwitches++;

    // Update average switch time
    const currentTotal = this.metrics.multiTenant.averageSwitchTime * (this.metrics.multiTenant.totalSwitches - 1);
    this.metrics.multiTenant.averageSwitchTime = (currentTotal + duration) / this.metrics.multiTenant.totalSwitches;
  }

  private updateAuditMetrics(duration: number): void {
    if (!this.metrics.audit) {
      this.metrics.audit = {
        eventsLogged: 0,
        averageLogTime: 0,
        totalEvents: 0
      };
    }

    this.metrics.audit.eventsLogged++;
    this.metrics.audit.totalEvents++;

    // Update average log time
    const currentTotal = this.metrics.audit.averageLogTime * (this.metrics.audit.totalEvents - 1);
    this.metrics.audit.averageLogTime = (currentTotal + duration) / this.metrics.audit.totalEvents;
  }

  private updateDependencyMetrics(count: number): void {
    if (!this.metrics.dependencies) {
      this.metrics.dependencies = {
        resolutionCount: 0,
        averageResolutionTime: 0,
        failedResolutions: 0
      };
    }

    this.metrics.dependencies.resolutionCount += count;
  }
}

export const phase1Monitor = Phase1Monitor.getInstance();
