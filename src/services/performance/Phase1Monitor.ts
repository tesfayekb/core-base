import { PerformanceMetrics } from './PerformanceMetrics';

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

  recordDatabaseQuery(query: string, duration: number, success: boolean = true): void {
    this.metrics.databaseQueries = this.metrics.databaseQueries || [];
    this.metrics.databaseQueries.push({
      query,
      duration,
      success,
      timestamp: Date.now(),
      executedAt: new Date()
    });
    console.log(`[Phase1Monitor] Database query recorded: ${query} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
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

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {};
  }
}

export const phase1Monitor = Phase1Monitor.getInstance();
