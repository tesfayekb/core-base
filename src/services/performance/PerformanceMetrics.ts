
export interface PerformanceMetrics {
  // API call tracking
  apiCalls?: Array<{
    endpoint: string;
    duration: number;
    success: boolean;
    timestamp: number;
    calledAt: Date;
  }>;

  // Cache metrics
  cacheHits?: number;
  cacheMisses?: number;
  cacheWarmups?: Array<{
    success: boolean;
    timestamp: number;
    completedAt: Date;
  }>;

  // Database metrics - Enhanced
  databaseQueries?: Array<{
    query: string;
    duration: number;
    success: boolean;
    timestamp: number;
    executedAt: Date;
  }>;
  database?: {
    averageQueryTime: number;
    totalQueries: number;
    failedQueries: number;
    slowQueries: number;
    connectionPoolStatus: string;
  };

  // Authentication metrics - New
  auth?: {
    loginTime: number;
    registrationTime: number;
    tokenValidation: number;
    failedAttempts: number;
  };

  // External service metrics
  externalServiceCalls?: Array<{
    serviceName: string;
    duration: number;
    success: boolean;
    timestamp: number;
    calledAt: Date;
  }>;

  // User login tracking
  userLogins?: Array<{
    userId: string;
    success: boolean;
    timestamp: number;
    loggedInAt: Date;
  }>;

  // Data ingestion tracking
  dataIngestions?: Array<{
    source: string;
    amount: number;
    success: boolean;
    timestamp: number;
    ingestedAt: Date;
  }>;

  // Security events
  securityEvents?: Array<{
    eventType: string;
    details: string;
    severity: string;
    timestamp: number;
    occurredAt: Date;
  }>;

  // Resource usage tracking
  resourceUsages?: Array<{
    resourceType: string;
    usage: number;
    unit: string;
    timestamp: number;
    recordedAt: Date;
  }>;

  // Error tracking - Enhanced
  errors?: Array<{
    errorType: string;
    message: string;
    stackTrace?: string;
    timestamp: number;
    occurredAt: Date;
    rate?: number;
  }>;

  // Custom events
  customEvents?: Array<{
    eventName: string;
    details: any;
    timestamp: number;
    occurredAt: Date;
  }>;

  // Task completion tracking
  taskCompletions?: Array<{
    taskId: string;
    success: boolean;
    timestamp: number;
    completedAt: Date;
  }>;
  completedTasks?: number;

  // RBAC/Permission metrics
  permissions?: {
    averageCheckTime: number;
    cacheHitRate: number;
    totalChecks: number;
    failedChecks: number;
  };

  // Multi-tenant metrics
  multiTenant?: {
    averageSwitchTime: number;
    isolationViolations: number;
    totalSwitches: number;
  };

  // Audit metrics
  audit?: {
    eventsLogged: number;
    averageLogTime: number;
    totalEvents: number;
  };

  // Dependency resolution metrics
  dependencies?: {
    resolutionCount: number;
    averageResolutionTime: number;
    failedResolutions: number;
  };

  // Cache metrics
  cache?: {
    warmupStatus: string;
    hitRate: number;
    missRate: number;
  };

  // Alert metrics
  alerts?: {
    activeAlerts: number;
    totalAlerts: number;
    resolvedAlerts: number;
  };
}

export interface HealthStatus {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  score: number;
  issues: string[];
  components: Record<string, any>;
}
