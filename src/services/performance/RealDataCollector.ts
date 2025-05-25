
export class RealDataCollector {
  private static instance: RealDataCollector;
  private performanceObserver: PerformanceObserver | null = null;
  private layoutShiftScore = 0;
  private longTaskDuration = 0;

  static getInstance(): RealDataCollector {
    if (!RealDataCollector.instance) {
      RealDataCollector.instance = new RealDataCollector();
    }
    return RealDataCollector.instance;
  }

  private constructor() {
    this.initializeObservers();
  }

  private initializeObservers(): void {
    if (typeof PerformanceObserver === 'undefined') {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      // Observe layout shifts for CLS calculation
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            this.layoutShiftScore += (entry as any).value;
          }
          
          if (entry.entryType === 'longtask') {
            this.longTaskDuration += entry.duration;
          }
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['layout-shift', 'longtask', 'navigation', 'paint'] 
      });

      console.log('📊 Real performance data collection initialized');
    } catch (error) {
      console.warn('Failed to initialize performance observers:', error);
    }
  }

  getCumulativeLayoutShift(): number {
    return this.layoutShiftScore;
  }

  getLongTaskDuration(): number {
    return this.longTaskDuration;
  }

  getNetworkInformation(): NetworkInformation | null {
    return (navigator as any).connection || null;
  }

  getMemoryInfo(): MemoryInfo | null {
    return (performance as any).memory || null;
  }

  getResourceTimings(): PerformanceResourceTiming[] {
    return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  }

  getNavigationTiming(): PerformanceNavigationTiming | null {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return entries[0] || null;
  }

  getPaintTimings(): PerformanceEntry[] {
    return performance.getEntriesByType('paint');
  }

  calculateFirstInputDelay(): Promise<number> {
    return new Promise((resolve) => {
      if (typeof PerformanceObserver === 'undefined') {
        resolve(0);
        return;
      }

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fid = (entry as any).processingStart - entry.startTime;
            observer.disconnect();
            resolve(fid);
            return;
          }
        }
      });

      observer.observe({ entryTypes: ['first-input'] });

      // Timeout after 10 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(0);
      }, 10000);
    });
  }

  disconnect(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }
}

interface NetworkInformation {
  downlink?: number;
  rtt?: number;
  effectiveType?: string;
  saveData?: boolean;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export const realDataCollector = RealDataCollector.getInstance();
