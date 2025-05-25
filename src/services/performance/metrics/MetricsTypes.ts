
export interface DetailedPerformanceMetrics {
  system: SystemMetrics;
  database: DetailedDatabaseMetrics;
  security: SecurityPerformanceMetrics;
  user: UserExperienceMetrics;
  network: NetworkMetrics;
  memory: MemoryMetrics;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
}

export interface DetailedDatabaseMetrics {
  totalQueries: number;
  queriesPerSecond: number;
  averageQueryTime: number;
  slowQueries: number;
  connectionPoolUtilization: number;
  cacheHitRate: number;
  indexEfficiency: number;
}

export interface SecurityPerformanceMetrics {
  authenticationLatency: number;
  permissionCheckLatency: number;
  securityEventsPerMinute: number;
  tenantSwitchLatency: number;
  auditWriteLatency: number;
  securityValidationRate: number;
}

export interface UserExperienceMetrics {
  pageLoadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  cumulativeLayoutShift: number;
  navigationTiming: number;
  apiResponseTimes: Record<string, number>;
}

export interface NetworkMetrics {
  bandwidth: number;
  latency: number;
  packetLoss: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  gcDuration: number;
  gcFrequency: number;
}
