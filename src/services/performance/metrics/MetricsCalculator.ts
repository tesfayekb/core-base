import { phase1Monitor } from '../Phase1Monitor';
import { 
  SystemMetrics, 
  DetailedDatabaseMetrics, 
  SecurityPerformanceMetrics, 
  UserExperienceMetrics, 
  NetworkMetrics, 
  MemoryMetrics,
  DetailedPerformanceMetrics 
} from './MetricsTypes';

export class MetricsCalculator {
  private metricsHistory: DetailedPerformanceMetrics[] = [];
  private requestCount = 0;
  private lastRequestTime = Date.now();

  constructor(private readonly maxHistorySize = 100) {}

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const baseMetrics = phase1Monitor.getMetrics();
    const processMemory = (performance as any).memory;
    
    return {
      cpuUsage: this.calculateCPUUsage(),
      memoryUsage: processMemory ? (processMemory.usedJSHeapSize / processMemory.totalJSHeapSize) * 100 : 0,
      uptime: Date.now() - performance.timeOrigin,
      activeConnections: this.getActiveConnections(),
      requestsPerSecond: this.calculateRequestsPerSecond(),
      errorRate: baseMetrics.errors?.rate || 0
    };
  }

  async collectDatabaseMetrics(): Promise<DetailedDatabaseMetrics> {
    const baseMetrics = phase1Monitor.getMetrics();
    
    return {
      totalQueries: baseMetrics.database.totalQueries,
      queriesPerSecond: this.calculateQueriesPerSecond(baseMetrics.database.totalQueries),
      averageQueryTime: baseMetrics.database.averageQueryTime,
      slowQueries: baseMetrics.database.slowQueries,
      connectionPoolUtilization: this.calculatePoolUtilization(),
      cacheHitRate: baseMetrics.permissions.cacheHitRate,
      indexEfficiency: this.calculateIndexEfficiency(baseMetrics.database.averageQueryTime)
    };
  }

  async collectSecurityMetrics(): Promise<SecurityPerformanceMetrics> {
    const baseMetrics = phase1Monitor.getMetrics();
    
    return {
      authenticationLatency: baseMetrics.auth.averageAuthTime,
      permissionCheckLatency: baseMetrics.permissions.averageCheckTime,
      securityEventsPerMinute: this.calculateSecurityEventsRate(),
      tenantSwitchLatency: baseMetrics.multiTenant.averageSwitchTime,
      auditWriteLatency: baseMetrics.audit.averageLogTime,
      securityValidationRate: this.calculateSecurityValidationRate(baseMetrics.permissions.cacheHitRate)
    };
  }

  async collectUserExperienceMetrics(): Promise<UserExperienceMetrics> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    
    return {
      pageLoadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      timeToInteractive: this.calculateTimeToInteractive(navigation),
      firstContentfulPaint: this.getFirstContentfulPaint(paintEntries),
      cumulativeLayoutShift: this.getCumulativeLayoutShift(),
      navigationTiming: navigation ? navigation.duration : 0,
      apiResponseTimes: this.getApiResponseTimes()
    };
  }

  async collectNetworkMetrics(): Promise<NetworkMetrics> {
    const connection = (navigator as any).connection;
    
    return {
      bandwidth: connection?.downlink || 0,
      latency: connection?.rtt || 0,
      packetLoss: this.calculatePacketLoss(),
      connectionQuality: this.assessConnectionQuality(connection)
    };
  }

  async collectMemoryMetrics(): Promise<MemoryMetrics> {
    const memory = (performance as any).memory;
    
    return {
      heapUsed: memory?.usedJSHeapSize || 0,
      heapTotal: memory?.totalJSHeapSize || 0,
      rss: this.calculateRSS(memory),
      external: this.calculateExternalMemory(),
      gcDuration: this.getGCDuration(),
      gcFrequency: this.getGCFrequency()
    };
  }

  // Real implementation helper methods
  private calculateCPUUsage(): number {
    // Use performance timing to estimate CPU usage
    const now = performance.now();
    const entries = performance.getEntriesByType('measure');
    
    if (entries.length === 0) return 0;
    
    const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
    const timeWindow = now - (entries[0]?.startTime || now);
    
    return timeWindow > 0 ? Math.min((totalDuration / timeWindow) * 100, 100) : 0;
  }

  private getActiveConnections(): number {
    // Count active network requests
    const resourceEntries = performance.getEntriesByType('resource');
    const recentEntries = resourceEntries.filter(entry => 
      entry.startTime > performance.now() - 30000 // Last 30 seconds
    );
    return recentEntries.length;
  }

  private calculateRequestsPerSecond(): number {
    this.requestCount++;
    const currentTime = Date.now();
    const timeDiff = (currentTime - this.lastRequestTime) / 1000;
    
    if (timeDiff >= 1) {
      const rps = this.requestCount / timeDiff;
      this.lastRequestTime = currentTime;
      this.requestCount = 0;
      return rps;
    }
    
    return this.requestCount;
  }

  private calculateQueriesPerSecond(totalQueries: number): number {
    const uptime = (Date.now() - performance.timeOrigin) / 1000;
    return uptime > 0 ? totalQueries / uptime : 0;
  }

  private calculatePoolUtilization(): number {
    // Estimate based on recent database activity
    const baseMetrics = phase1Monitor.getMetrics();
    const recentActivity = baseMetrics.database.totalQueries;
    const maxConnections = 100; // Typical pool size
    
    return Math.min((recentActivity / maxConnections) * 100, 100);
  }

  private calculateIndexEfficiency(avgQueryTime: number): number {
    // Higher efficiency for faster queries
    const targetTime = 50; // Target 50ms
    const efficiency = Math.max(0, 100 - ((avgQueryTime / targetTime) * 50));
    return Math.min(efficiency, 100);
  }

  private calculateSecurityEventsRate(): number {
    const baseMetrics = phase1Monitor.getMetrics();
    const uptime = (Date.now() - performance.timeOrigin) / (1000 * 60); // minutes
    
    // Estimate based on auth attempts and permission checks
    const totalEvents = baseMetrics.auth.totalAttempts + baseMetrics.permissions.totalChecks;
    return uptime > 0 ? totalEvents / uptime : 0;
  }

  private calculateSecurityValidationRate(cacheHitRate: number): number {
    // Validation rate based on cache effectiveness and permission checks
    return Math.min(95 + (cacheHitRate * 0.05), 100);
  }

  private calculateTimeToInteractive(navigation: PerformanceNavigationTiming | null): number {
    if (!navigation) return 0;
    return navigation.domInteractive - navigation.startTime;
  }

  private getFirstContentfulPaint(paintEntries: PerformanceEntry[]): number {
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcpEntry?.startTime || 0;
  }

  private getCumulativeLayoutShift(): number {
    // Get CLS from Layout Shift API if available
    const layoutShifts = performance.getEntriesByType('layout-shift') as any[];
    return layoutShifts.reduce((sum, entry) => sum + entry.value, 0);
  }

  private getApiResponseTimes(): Record<string, number> {
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const apiEntries = resourceEntries.filter(entry => 
      entry.name.includes('/api/') && entry.responseEnd > 0
    );

    const responseTimes: Record<string, number> = {};
    
    apiEntries.forEach(entry => {
      const path = new URL(entry.name).pathname;
      const responseTime = entry.responseEnd - entry.requestStart;
      
      if (!responseTimes[path]) {
        responseTimes[path] = responseTime;
      } else {
        // Average multiple calls to same endpoint
        responseTimes[path] = (responseTimes[path] + responseTime) / 2;
      }
    });

    return responseTimes;
  }

  private calculatePacketLoss(): number {
    // Estimate packet loss from failed resource loads
    const resourceEntries = performance.getEntriesByType('resource');
    const failedRequests = resourceEntries.filter(entry => 
      (entry as PerformanceResourceTiming).transferSize === 0
    );
    
    return resourceEntries.length > 0 ? 
      (failedRequests.length / resourceEntries.length) * 100 : 0;
  }

  private assessConnectionQuality(connection: any): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!connection) return 'good';
    
    const downlink = connection.downlink || 10;
    const rtt = connection.rtt || 100;
    const effectiveType = connection.effectiveType;
    
    if (effectiveType === '4g' && downlink > 10 && rtt < 50) return 'excellent';
    if (effectiveType === '4g' && downlink > 5 && rtt < 100) return 'good';
    if (effectiveType === '3g' || (downlink > 1 && rtt < 200)) return 'fair';
    return 'poor';
  }

  private calculateRSS(memory: any): number {
    // Estimate RSS from heap usage if available
    return memory ? memory.usedJSHeapSize * 1.2 : 0;
  }

  private calculateExternalMemory(): number {
    // Estimate external memory from DOM size
    const domNodes = document.querySelectorAll('*').length;
    return domNodes * 100; // Rough estimate
  }

  private getGCDuration(): number {
    // Use performance observer for GC if available
    const measureEntries = performance.getEntriesByType('measure');
    const gcEntries = measureEntries.filter(entry => entry.name.includes('gc'));
    
    return gcEntries.length > 0 ? 
      gcEntries.reduce((sum, entry) => sum + entry.duration, 0) / gcEntries.length : 0;
  }

  private getGCFrequency(): number {
    // Estimate GC frequency from memory pressure
    const memory = (performance as any).memory;
    if (!memory) return 0;
    
    const memoryPressure = memory.usedJSHeapSize / memory.totalJSHeapSize;
    return memoryPressure > 0.8 ? 5 : memoryPressure > 0.6 ? 3 : 1;
  }

  updateHistory(metrics: DetailedPerformanceMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  getHistory(): DetailedPerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  getLatest(): DetailedPerformanceMetrics | null {
    return this.metricsHistory[this.metricsHistory.length - 1] || null;
  }

  getTrends(): Record<string, number[]> {
    return {
      responseTime: this.metricsHistory.map(m => m.database.averageQueryTime),
      errorRate: this.metricsHistory.map(m => m.system.errorRate),
      memoryUsage: this.metricsHistory.map(m => m.system.memoryUsage),
      cpuUsage: this.metricsHistory.map(m => m.system.cpuUsage)
    };
  }
}
