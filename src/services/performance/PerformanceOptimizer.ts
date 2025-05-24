
// Performance Optimizer - Identifies and suggests fixes for bottlenecks
// Automated performance analysis and optimization recommendations

export interface PerformanceBottleneck {
  component: string;
  operation: string;
  currentPerformance: number;
  targetPerformance: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  estimatedImprovement: number;
}

export interface OptimizationPlan {
  bottlenecks: PerformanceBottleneck[];
  quickWins: PerformanceBottleneck[];
  majorOptimizations: PerformanceBottleneck[];
  estimatedTotalImprovement: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  
  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  analyzePerformance(benchmarkResults: Record<string, any>): OptimizationPlan {
    const bottlenecks: PerformanceBottleneck[] = [];
    
    // Analyze each performance metric
    Object.entries(benchmarkResults).forEach(([category, results]) => {
      Object.entries(results).forEach(([operation, data]: [string, any]) => {
        if (data.passed === false) {
          const bottleneck = this.createBottleneck(category, operation, data);
          if (bottleneck) {
            bottlenecks.push(bottleneck);
          }
        }
      });
    });

    return this.createOptimizationPlan(bottlenecks);
  }

  private createBottleneck(
    component: string, 
    operation: string, 
    data: any
  ): PerformanceBottleneck | null {
    if (!data.averageDuration || !data.target) {
      return null;
    }

    const ratio = data.averageDuration / data.target;
    const severity = this.calculateSeverity(ratio);
    const recommendations = this.generateRecommendations(component, operation, ratio);
    const estimatedImprovement = this.estimateImprovement(component, operation, ratio);

    return {
      component,
      operation,
      currentPerformance: data.averageDuration,
      targetPerformance: data.target,
      severity,
      recommendations,
      estimatedImprovement
    };
  }

  private calculateSeverity(ratio: number): 'low' | 'medium' | 'high' | 'critical' {
    if (ratio > 5) return 'critical';
    if (ratio > 3) return 'high';
    if (ratio > 2) return 'medium';
    return 'low';
  }

  private generateRecommendations(component: string, operation: string, ratio: number): string[] {
    const recommendations: string[] = [];

    // Component-specific recommendations
    switch (component) {
      case 'database':
        if (operation.includes('Query')) {
          recommendations.push('Add database indexes for frequently queried columns');
          recommendations.push('Optimize query complexity and reduce N+1 queries');
          if (ratio > 3) {
            recommendations.push('Consider query caching implementation');
            recommendations.push('Review database connection pooling configuration');
          }
        }
        if (operation.includes('connectionPool')) {
          recommendations.push('Increase connection pool size');
          recommendations.push('Optimize connection acquisition timeout');
          recommendations.push('Review connection lifecycle management');
        }
        break;

      case 'authentication':
        recommendations.push('Implement authentication result caching');
        recommendations.push('Optimize token generation and validation');
        if (ratio > 2) {
          recommendations.push('Consider async authentication for non-critical operations');
        }
        break;

      case 'rbac':
        recommendations.push('Implement permission caching with smart invalidation');
        recommendations.push('Optimize permission resolution query complexity');
        if (ratio > 2) {
          recommendations.push('Pre-compute common permission combinations');
        }
        break;

      case 'monitoring':
        recommendations.push('Implement metric sampling for high-frequency operations');
        recommendations.push('Optimize metrics collection and aggregation');
        break;
    }

    // General performance recommendations
    if (ratio > 3) {
      recommendations.push('Profile code execution to identify specific bottlenecks');
      recommendations.push('Consider implementing circuit breaker pattern');
    }

    return recommendations;
  }

  private estimateImprovement(component: string, operation: string, ratio: number): number {
    // Estimated performance improvement percentage based on component and severity
    const baseImprovement = Math.min(80, (ratio - 1) * 20);
    
    // Component-specific improvement factors
    const componentFactors = {
      database: 1.2, // Database optimizations often yield high improvements
      rbac: 1.1,     // Permission caching can be very effective
      authentication: 1.0,
      monitoring: 0.9 // Monitoring optimizations typically yield moderate improvements
    };

    const factor = componentFactors[component as keyof typeof componentFactors] || 1.0;
    return Math.round(baseImprovement * factor);
  }

  private createOptimizationPlan(bottlenecks: PerformanceBottleneck[]): OptimizationPlan {
    const quickWins = bottlenecks.filter(b => 
      b.estimatedImprovement > 30 && 
      (b.severity === 'low' || b.severity === 'medium')
    );

    const majorOptimizations = bottlenecks.filter(b => 
      b.severity === 'high' || b.severity === 'critical'
    );

    const estimatedTotalImprovement = bottlenecks.reduce(
      (total, b) => total + (b.estimatedImprovement * 0.7), // Assume 70% effectiveness
      0
    );

    return {
      bottlenecks,
      quickWins,
      majorOptimizations,
      estimatedTotalImprovement: Math.min(85, estimatedTotalImprovement) // Cap at 85%
    };
  }

  generateOptimizationReport(plan: OptimizationPlan): string {
    let report = '🎯 PERFORMANCE OPTIMIZATION ANALYSIS\n';
    report += '=====================================\n\n';

    report += `📊 Summary:\n`;
    report += `- Total bottlenecks identified: ${plan.bottlenecks.length}\n`;
    report += `- Quick wins available: ${plan.quickWins.length}\n`;
    report += `- Major optimizations needed: ${plan.majorOptimizations.length}\n`;
    report += `- Estimated total improvement: ${plan.estimatedTotalImprovement.toFixed(0)}%\n\n`;

    if (plan.quickWins.length > 0) {
      report += '🚀 QUICK WINS (Implement First):\n';
      plan.quickWins.forEach((bottleneck, index) => {
        report += `${index + 1}. ${bottleneck.component}.${bottleneck.operation}\n`;
        report += `   Performance: ${bottleneck.currentPerformance.toFixed(1)}ms → ${bottleneck.targetPerformance}ms target\n`;
        report += `   Top recommendation: ${bottleneck.recommendations[0]}\n`;
        report += `   Estimated improvement: ${bottleneck.estimatedImprovement}%\n\n`;
      });
    }

    if (plan.majorOptimizations.length > 0) {
      report += '🔧 MAJOR OPTIMIZATIONS (Critical for Phase 2):\n';
      plan.majorOptimizations.forEach((bottleneck, index) => {
        report += `${index + 1}. ${bottleneck.component}.${bottleneck.operation} [${bottleneck.severity.toUpperCase()}]\n`;
        report += `   Performance: ${bottleneck.currentPerformance.toFixed(1)}ms → ${bottleneck.targetPerformance}ms target\n`;
        report += `   Recommendations:\n`;
        bottleneck.recommendations.forEach(rec => {
          report += `   - ${rec}\n`;
        });
        report += `   Estimated improvement: ${bottleneck.estimatedImprovement}%\n\n`;
      });
    }

    if (plan.bottlenecks.length === 0) {
      report += '🏆 EXCELLENT: All performance targets met!\n';
      report += 'System is ready for Phase 2 implementation.\n';
    }

    return report;
  }
}
