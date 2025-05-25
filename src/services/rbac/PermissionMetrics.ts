
export class PermissionMetrics {
  private performanceMetrics = new Map<string, number[]>();

  recordPerformanceMetric(action: string, resolutionTime: number): void {
    if (!this.performanceMetrics.has(action)) {
      this.performanceMetrics.set(action, []);
    }
    const metrics = this.performanceMetrics.get(action)!;
    metrics.push(resolutionTime);
    
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  getPerformanceStats(): Record<string, { avg: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; max: number; count: number }> = {};
    
    for (const [action, times] of this.performanceMetrics.entries()) {
      if (times.length > 0) {
        stats[action] = {
          avg: times.reduce((sum, time) => sum + time, 0) / times.length,
          max: Math.max(...times),
          count: times.length
        };
      }
    }
    
    return stats;
  }
}
