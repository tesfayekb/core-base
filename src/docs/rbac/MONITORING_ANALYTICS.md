# Monitoring and Analytics

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-20

## Overview

This document details the monitoring, metrics collection, and analytics implementation for the permission system to aid in optimization and troubleshooting.

## Metrics Collection

### Performance Metrics Tracking

```typescript
class PermissionMetrics {
  // Performance timing histograms
  private static readonly CHECK_LATENCY = new LatencyHistogram();
  private static readonly CACHE_LATENCY = new LatencyHistogram();
  private static readonly DB_LATENCY = new LatencyHistogram();
  
  // Cache hit/miss tracking
  private static cacheHits = 0;
  private static cacheMisses = 0;
  private static readonly CACHE_STATS_BY_RESOURCE: Map<string, { hits: number, misses: number }> = new Map();
  
  // Query plan tracking
  private static readonly SLOW_QUERIES: Array<{ sql: string, params: any[], duration: number }> = [];
  private static readonly SLOW_QUERY_THRESHOLD = 100; // milliseconds
  
  // Memory consumption tracking
  private static readonly MEMORY_SAMPLES: number[] = [];
  private static readonly MAX_MEMORY_SAMPLES = 100;
  
  // Record permission check timing
  static recordCheck(resource: string, action: string, duration: number, fromCache: boolean): void {
    this.CHECK_LATENCY.record(duration);
    
    // Update cache stats
    if (fromCache) {
      this.cacheHits++;
      this.updateResourceCacheStats(resource, true);
    } else {
      this.cacheMisses++;
      this.updateResourceCacheStats(resource, false);
    }
  }
  
  private static updateResourceCacheStats(resource: string, hit: boolean): void {
    const stats = this.CACHE_STATS_BY_RESOURCE.get(resource) || { hits: 0, misses: 0 };
    
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    
    this.CACHE_STATS_BY_RESOURCE.set(resource, stats);
  }
  
  // Record cache operation timing
  static recordCacheOperation(operation: 'get' | 'set' | 'delete', duration: number): void {
    this.CACHE_LATENCY.record(duration);
  }
  
  // Record database query timing
  static recordDatabaseQuery(sql: string, params: any[], duration: number): void {
    this.DB_LATENCY.record(duration);
    
    // Track slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.SLOW_QUERIES.push({ sql, params, duration });
      
      // Keep only recent slow queries
      if (this.SLOW_QUERIES.length > 100) {
        this.SLOW_QUERIES.shift();
      }
      
      // Log slow query
      console.warn(`Slow permission query (${duration}ms):`, { sql, params });
    }
  }
  
  // Record memory usage
  static recordMemoryUsage(usageInBytes: number): void {
    this.MEMORY_SAMPLES.push(usageInBytes);
    
    if (this.MEMORY_SAMPLES.length > this.MAX_MEMORY_SAMPLES) {
      this.MEMORY_SAMPLES.shift();
    }
  }
  
  // Get metrics report
  static getReport(): any {
    const cacheHitRate = this.cacheHits / (this.cacheHits + this.cacheMisses);
    
    // Get resource-specific hit rates
    const resourceHitRates: Record<string, number> = {};
    this.CACHE_STATS_BY_RESOURCE.forEach((stats, resource) => {
      resourceHitRates[resource] = stats.hits / (stats.hits + stats.misses);
    });
    
    // Sort resources by miss rate (descending)
    const resourcesByMissRate = [...this.CACHE_STATS_BY_RESOURCE.entries()]
      .map(([resource, stats]) => ({
        resource,
        missRate: stats.misses / (stats.hits + stats.misses),
        total: stats.hits + stats.misses
      }))
      .sort((a, b) => b.missRate - a.missRate);
    
    return {
      checkLatency: {
        p50: this.CHECK_LATENCY.getPercentile(50),
        p90: this.CHECK_LATENCY.getPercentile(90),
        p99: this.CHECK_LATENCY.getPercentile(99),
      },
      cacheLatency: {
        p50: this.CACHE_LATENCY.getPercentile(50),
        p90: this.CACHE_LATENCY.getPercentile(90),
        p99: this.CACHE_LATENCY.getPercentile(99),
      },
      dbLatency: {
        p50: this.DB_LATENCY.getPercentile(50),
        p90: this.DB_LATENCY.getPercentile(90),
        p99: this.DB_LATENCY.getPercentile(99),
      },
      cacheStats: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: cacheHitRate,
        resourceHitRates,
        worstPerformers: resourcesByMissRate.slice(0, 10)
      },
      slowQueries: this.SLOW_QUERIES.slice(0, 10),
      memoryUsage: {
        current: this.MEMORY_SAMPLES[this.MEMORY_SAMPLES.length - 1],
        average: this.MEMORY_SAMPLES.reduce((sum, val) => sum + val, 0) / this.MEMORY_SAMPLES.length,
        max: Math.max(...this.MEMORY_SAMPLES),
        trend: this.calculateMemoryTrend()
      }
    };
  }
  
  private static calculateMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.MEMORY_SAMPLES.length < 10) return 'stable';
    
    const recentSamples = this.MEMORY_SAMPLES.slice(-10);
    const firstAvg = recentSamples.slice(0, 5).reduce((sum, val) => sum + val, 0) / 5;
    const lastAvg = recentSamples.slice(5).reduce((sum, val) => sum + val, 0) / 5;
    
    const percentChange = (lastAvg - firstAvg) / firstAvg;
    
    if (percentChange > 0.1) return 'increasing';
    if (percentChange < -0.1) return 'decreasing';
    return 'stable';
  }
  
  // Reset metrics
  static reset(): void {
    this.CHECK_LATENCY.reset();
    this.CACHE_LATENCY.reset();
    this.DB_LATENCY.reset();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.CACHE_STATS_BY_RESOURCE.clear();
    this.SLOW_QUERIES.length = 0;
    this.MEMORY_SAMPLES.length = 0;
  }
}
```

### Latency Histogram

```typescript
class LatencyHistogram {
  private readonly buckets: number[] = new Array(32).fill(0);
  private readonly bucketBoundaries: number[];
  private count = 0;
  private sum = 0;
  private min = Number.MAX_SAFE_INTEGER;
  private max = 0;
  
  constructor() {
    // Exponential bucket boundaries from 0.1ms to 10s
    this.bucketBoundaries = [];
    for (let i = 0; i < 32; i++) {
      this.bucketBoundaries[i] = 0.1 * Math.pow(2, i / 4);
    }
  }
  
  // Record a latency value in milliseconds
  record(value: number): void {
    this.count++;
    this.sum += value;
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);
    
    // Find appropriate bucket
    for (let i = 0; i < this.bucketBoundaries.length; i++) {
      if (value <= this.bucketBoundaries[i]) {
        this.buckets[i]++;
        return;
      }
    }
    
    // Value is larger than the largest bucket boundary
    this.buckets[this.buckets.length - 1]++;
  }
  
  // Get a specific percentile value
  getPercentile(percentile: number): number {
    if (this.count === 0) return 0;
    
    const targetCount = Math.floor((percentile / 100) * this.count);
    let cumulativeCount = 0;
    
    for (let i = 0; i < this.buckets.length; i++) {
      cumulativeCount += this.buckets[i];
      
      if (cumulativeCount >= targetCount) {
        // Use linear interpolation within the bucket
        const bucketStart = i === 0 ? 0 : this.bucketBoundaries[i - 1];
        const bucketEnd = this.bucketBoundaries[i];
        const bucketSize = this.buckets[i];
        const countBeforeBucket = cumulativeCount - bucketSize;
        const positionInBucket = (targetCount - countBeforeBucket) / bucketSize;
        
        return bucketStart + positionInBucket * (bucketEnd - bucketStart);
      }
    }
    
    return this.max;
  }
  
  // Reset the histogram
  reset(): void {
    this.buckets.fill(0);
    this.count = 0;
    this.sum = 0;
    this.min = Number.MAX_SAFE_INTEGER;
    this.max = 0;
  }
  
  // Get mean value
  getMean(): number {
    return this.count > 0 ? this.sum / this.count : 0;
  }
}
```

## Analytics Implementation

### Permission Usage Analytics

```typescript
class PermissionAnalytics {
  // Track permission access patterns
  private static readonly accessPatterns: Map<string, {
    count: number,
    lastAccessed: number,
    resources: Set<string>,
    users: Set<string>
  }> = new Map();
  
  // Track user permission profiles
  private static readonly userProfiles: Map<string, {
    accessCount: number,
    uniqueResources: Set<string>,
    uniqueActions: Set<string>,
    patternsByFrequency: Map<string, number>
  }> = new Map();
  
  // Record a permission access
  static recordAccess(userId: string, resource: string, action: string): void {
    const now = Date.now();
    const patternKey = `${resource}:${action}`;
    
    // Update access pattern
    const pattern = this.accessPatterns.get(patternKey) || {
      count: 0,
      lastAccessed: now,
      resources: new Set<string>(),
      users: new Set<string>()
    };
    
    pattern.count++;
    pattern.lastAccessed = now;
    pattern.resources.add(resource);
    pattern.users.add(userId);
    
    this.accessPatterns.set(patternKey, pattern);
    
    // Update user profile
    const profile = this.userProfiles.get(userId) || {
      accessCount: 0,
      uniqueResources: new Set<string>(),
      uniqueActions: new Set<string>(),
      patternsByFrequency: new Map<string, number>()
    };
    
    profile.accessCount++;
    profile.uniqueResources.add(resource);
    profile.uniqueActions.add(action);
    
    const patternCount = profile.patternsByFrequency.get(patternKey) || 0;
    profile.patternsByFrequency.set(patternKey, patternCount + 1);
    
    this.userProfiles.set(userId, profile);
  }
  
  // Find groups of correlated permissions
  static findCorrelatedPermissions(minCorrelation: number = 0.7): Array<string[]> {
    const patterns = [...this.accessPatterns.keys()];
    const correlationMatrix: number[][] = [];
    
    // Calculate correlation matrix
    for (let i = 0; i < patterns.length; i++) {
      correlationMatrix[i] = [];
      const patternA = this.accessPatterns.get(patterns[i])!;
      
      for (let j = 0; j < patterns.length; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1; // Self correlation is 1
          continue;
        }
        
        const patternB = this.accessPatterns.get(patterns[j])!;
        
        // Calculate Jaccard similarity coefficient for users
        const usersInA = patternA.users.size;
        const usersInB = patternB.users.size;
        
        const intersection = new Set(
          [...patternA.users].filter(x => patternB.users.has(x))
        ).size;
        
        const union = usersInA + usersInB - intersection;
        const correlation = union > 0 ? intersection / union : 0;
        
        correlationMatrix[i][j] = correlation;
      }
    }
    
    // Find groups of correlated permissions using hierarchical clustering
    const groups: Array<string[]> = [];
    const visited = new Set<number>();
    
    for (let i = 0; i < patterns.length; i++) {
      if (visited.has(i)) continue;
      
      const group: string[] = [patterns[i]];
      visited.add(i);
      
      for (let j = 0; j < patterns.length; j++) {
        if (i === j || visited.has(j)) continue;
        
        if (correlationMatrix[i][j] >= minCorrelation) {
          group.push(patterns[j]);
          visited.add(j);
        }
      }
      
      if (group.length > 1) {
        groups.push(group);
      }
    }
    
    return groups;
  }
  
  // Predict likely needed permissions based on access patterns
  static predictNeededPermissions(userId: string, resource: string): string[] {
    const profile = this.userProfiles.get(userId);
    if (!profile) return [];
    
    // Find patterns involving this resource
    const resourcePatterns = [...this.accessPatterns.entries()]
      .filter(([key]) => key.startsWith(`${resource}:`))
      .map(([key, pattern]) => ({
        key,
        pattern,
        action: key.split(':')[1],
        userHasAccessed: profile.patternsByFrequency.has(key)
      }));
    
    // If user has accessed this resource before, find correlated patterns
    const accessedPatterns = resourcePatterns.filter(p => p.userHasAccessed);
    
    if (accessedPatterns.length === 0) {
      // User hasn't accessed this resource before, suggest common patterns
      return resourcePatterns
        .sort((a, b) => b.pattern.count - a.pattern.count)
        .slice(0, 3)
        .map(p => p.action);
    }
    
    // Find correlated patterns from other resources
    const correlatedActions = new Map<string, number>();
    
    accessedPatterns.forEach(accessedPattern => {
      // Find users who accessed this pattern
      const users = accessedPattern.pattern.users;
      
      // Find what other permissions those users commonly access
      [...this.accessPatterns.entries()].forEach(([key, pattern]) => {
        if (key === accessedPattern.key || !key.startsWith(`${resource}:`)) return;
        
        // Calculate how many users have both permissions
        const commonUsers = [...users].filter(u => pattern.users.has(u)).length;
        const correlation = commonUsers / users.size;
        
        if (correlation >= 0.3) {
          // Extract action from the correlated pattern
          const action = key.split(':')[1];
          const score = correlatedActions.get(action) || 0;
          correlatedActions.set(action, score + correlation);
        }
      });
    });
    
    // Return top correlated actions
    return [...correlatedActions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action]) => action);
  }
  
  // Get aggregated analytics
  static getAnalytics(): any {
    // Calculate overall statistics
    const totalPatterns = this.accessPatterns.size;
    const totalUsers = new Set([...this.userProfiles.keys()]).size;
    
    // Find top accessed patterns
    const topPatterns = [...this.accessPatterns.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([key, pattern]) => ({
        pattern: key,
        count: pattern.count,
        uniqueUsers: pattern.users.size
      }));
    
    // Find most active users
    const activeUsers = [...this.userProfiles.entries()]
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 10)
      .map(([userId, profile]) => ({
        userId,
        accessCount: profile.accessCount,
        uniqueResources: profile.uniqueResources.size,
        uniqueActions: profile.uniqueActions.size
      }));
    
    // Find permission groups
    const permissionGroups = this.findCorrelatedPermissions(0.7);
    
    return {
      overview: {
        totalPatterns,
        totalUsers,
        totalAccesses: [...this.userProfiles.values()]
          .reduce((sum, profile) => sum + profile.accessCount, 0)
      },
      topPatterns,
      activeUsers,
      permissionGroups: permissionGroups.map(group => ({
        size: group.length,
        permissions: group
      }))
    };
  }
  
  // Clear old data to prevent unbounded growth
  static pruneData(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    
    // Prune old access patterns
    this.accessPatterns.forEach((pattern, key) => {
      if (pattern.lastAccessed < cutoff) {
        this.accessPatterns.delete(key);
      }
    });
    
    // Prune user profiles with no recent activity
    // (This requires tracking last activity timestamp for users)
  }
}
```

## Dashboards and Visualizations

### Permission Analytics Dashboard

```typescript
class PermissionDashboard {
  // Real-time permission metrics updates
  static startMetricsCollection(updateInterval: number = 5000): void {
    setInterval(() => {
      const metrics = PermissionMetrics.getReport();
      this.updateDashboard(metrics);
    }, updateInterval);
  }
  
  // Update dashboard with latest metrics
  private static updateDashboard(metrics: any): void {
    // Update latency charts
    this.updateLatencyCharts(metrics);
    
    // Update cache statistics
    this.updateCacheStats(metrics.cacheStats);
    
    // Update memory usage graph
    this.updateMemoryUsage(metrics.memoryUsage);
    
    // Update slow query list
    this.updateSlowQueryList(metrics.slowQueries);
    
    // Check for alerts
    this.checkAlerts(metrics);
  }
  
  // Update latency charts
  private static updateLatencyCharts(metrics: any): void {
    // Implementation would update chart data in the UI
    console.log('Updating latency charts:', {
      checkLatency: metrics.checkLatency,
      cacheLatency: metrics.cacheLatency,
      dbLatency: metrics.dbLatency
    });
  }
  
  // Update cache statistics display
  private static updateCacheStats(stats: any): void {
    // Implementation would update cache statistics in the UI
    console.log('Updating cache statistics:', {
      hitRate: stats.hitRate,
      hits: stats.hits,
      misses: stats.misses,
      worstPerformers: stats.worstPerformers.slice(0, 3)
    });
  }
  
  // Update memory usage graph
  private static updateMemoryUsage(usage: any): void {
    // Implementation would update memory usage chart in the UI
    console.log('Updating memory usage:', {
      current: formatBytes(usage.current),
      average: formatBytes(usage.average),
      max: formatBytes(usage.max),
      trend: usage.trend
    });
  }
  
  // Update slow query list
  private static updateSlowQueryList(queries: any[]): void {
    // Implementation would update slow query list in the UI
    console.log('Updating slow queries:', queries.slice(0, 3));
  }
  
  // Check for alerts based on metrics
  private static checkAlerts(metrics: any): void {
    // Check for high latency
    if (metrics.checkLatency.p99 > 500) {
      this.showAlert('High Permission Check Latency', 
        `99th percentile latency is ${metrics.checkLatency.p99}ms`);
    }
    
    // Check for low cache hit rate
    if (metrics.cacheStats.hitRate < 0.5 && 
        metrics.cacheStats.hits + metrics.cacheStats.misses > 1000) {
      this.showAlert('Low Cache Hit Rate', 
        `Cache hit rate is ${(metrics.cacheStats.hitRate * 100).toFixed(1)}%`);
    }
    
    // Check for memory growth
    if (metrics.memoryUsage.trend === 'increasing' && 
        metrics.memoryUsage.current > 100 * 1024 * 1024) { // 100 MB
      this.showAlert('Increasing Memory Usage', 
        `Memory usage is ${formatBytes(metrics.memoryUsage.current)} and growing`);
    }
    
    // Check for slow queries
    if (metrics.slowQueries.length > 0 && 
        metrics.slowQueries[0].duration > 500) {
      this.showAlert('Very Slow Permission Query', 
        `Slowest query took ${metrics.slowQueries[0].duration}ms`);
    }
  }
  
  // Show alert in dashboard
  private static showAlert(title: string, message: string): void {
    console.warn(`ALERT: ${title} - ${message}`);
    // Implementation would show alert in the UI
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

## Related Documentation

- **[README.md](README.md)**: RBAC system overview
- **[CACHING_STRATEGY.md](CACHING_STRATEGY.md)**: Multi-level caching approach for permissions
- **[DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md)**: Database design and optimization for permissions
- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)**: Performance techniques for the permission system
- **[../audit/README.md](../audit/README.md)**: Permission change logging architecture
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: How RBAC events are audited

## Version History

- **1.0.0**: Initial document created from RBAC_SYSTEM.md refactoring
