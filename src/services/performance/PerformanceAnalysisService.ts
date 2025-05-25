
// Performance Analysis Service - Advanced Analytics and Insights
// Provides detailed performance analysis and recommendations

import { DetailedPerformanceMetrics, detailedMetricsCollector } from './DetailedMetricsCollector';

export interface PerformanceInsight {
  type: 'warning' | 'critical' | 'optimization' | 'info';
  category: 'database' | 'security' | 'user-experience' | 'system' | 'network';
  message: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  metric: string;
  currentValue: number;
  targetValue: number;
}

export interface PerformanceAnalysis {
  overallScore: number;
  insights: PerformanceInsight[];
  trends: Record<string, 'improving' | 'stable' | 'degrading'>;
  recommendations: string[];
}

export class PerformanceAnalysisService {
  private static instance: PerformanceAnalysisService;

  static getInstance(): PerformanceAnalysisService {
    if (!PerformanceAnalysisService.instance) {
      PerformanceAnalysisService.instance = new PerformanceAnalysisService();
    }
    return PerformanceAnalysisService.instance;
  }

  analyzePerformance(): PerformanceAnalysis {
    const latestMetrics = detailedMetricsCollector.getLatestMetrics();
    const trends = detailedMetricsCollector.getPerformanceTrends();
    
    if (!latestMetrics) {
      return {
        overallScore: 0,
        insights: [],
        trends: {},
        recommendations: ['No performance data available yet']
      };
    }

    const insights = this.generateInsights(latestMetrics);
    const performanceTrends = this.analyzeTrends(trends);
    const overallScore = this.calculateOverallScore(latestMetrics, insights);
    const recommendations = this.generateRecommendations(insights);

    return {
      overallScore,
      insights,
      trends: performanceTrends,
      recommendations
    };
  }

  private generateInsights(metrics: DetailedPerformanceMetrics): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];

    // Database performance insights
    if (metrics.database.averageQueryTime > 50) {
      insights.push({
        type: 'warning',
        category: 'database',
        message: 'Database query performance is below target',
        recommendation: 'Consider adding database indexes or optimizing queries',
        impact: 'high',
        metric: 'averageQueryTime',
        currentValue: metrics.database.averageQueryTime,
        targetValue: 50
      });
    }

    if (metrics.database.cacheHitRate < 85) {
      insights.push({
        type: 'optimization',
        category: 'database',
        message: 'Cache hit rate is below optimal threshold',
        recommendation: 'Review caching strategy and increase cache size',
        impact: 'medium',
        metric: 'cacheHitRate',
        currentValue: metrics.database.cacheHitRate,
        targetValue: 85
      });
    }

    // Security performance insights
    if (metrics.security.authenticationLatency > 200) {
      insights.push({
        type: 'warning',
        category: 'security',
        message: 'Authentication latency exceeds target',
        recommendation: 'Optimize authentication process or implement caching',
        impact: 'high',
        metric: 'authenticationLatency',
        currentValue: metrics.security.authenticationLatency,
        targetValue: 200
      });
    }

    if (metrics.security.permissionCheckLatency > 15) {
      insights.push({
        type: 'optimization',
        category: 'security',
        message: 'Permission checks are slower than target',
        recommendation: 'Implement permission caching or optimize RBAC queries',
        impact: 'medium',
        metric: 'permissionCheckLatency',
        currentValue: metrics.security.permissionCheckLatency,
        targetValue: 15
      });
    }

    // User experience insights
    if (metrics.user.pageLoadTime > 2000) {
      insights.push({
        type: 'critical',
        category: 'user-experience',
        message: 'Page load time exceeds acceptable threshold',
        recommendation: 'Implement code splitting, optimize assets, use CDN',
        impact: 'high',
        metric: 'pageLoadTime',
        currentValue: metrics.user.pageLoadTime,
        targetValue: 2000
      });
    }

    if (metrics.user.cumulativeLayoutShift > 0.1) {
      insights.push({
        type: 'warning',
        category: 'user-experience',
        message: 'Layout stability issues detected',
        recommendation: 'Fix layout shifts by reserving space for dynamic content',
        impact: 'medium',
        metric: 'cumulativeLayoutShift',
        currentValue: metrics.user.cumulativeLayoutShift,
        targetValue: 0.1
      });
    }

    // System insights
    if (metrics.system.memoryUsage > 80) {
      insights.push({
        type: 'warning',
        category: 'system',
        message: 'High memory usage detected',
        recommendation: 'Investigate memory leaks and optimize memory usage',
        impact: 'high',
        metric: 'memoryUsage',
        currentValue: metrics.system.memoryUsage,
        targetValue: 80
      });
    }

    if (metrics.system.errorRate > 5) {
      insights.push({
        type: 'critical',
        category: 'system',
        message: 'Error rate is above acceptable threshold',
        recommendation: 'Investigate and fix recurring errors',
        impact: 'high',
        metric: 'errorRate',
        currentValue: metrics.system.errorRate,
        targetValue: 5
      });
    }

    // Network insights
    if (metrics.network.connectionQuality === 'poor') {
      insights.push({
        type: 'info',
        category: 'network',
        message: 'Poor network conditions detected',
        recommendation: 'Implement offline capabilities and optimize for slow connections',
        impact: 'medium',
        metric: 'connectionQuality',
        currentValue: 1,
        targetValue: 3
      });
    }

    return insights;
  }

  private analyzeTrends(trends: Record<string, number[]>): Record<string, 'improving' | 'stable' | 'degrading'> {
    const trendAnalysis: Record<string, 'improving' | 'stable' | 'degrading'> = {};

    Object.entries(trends).forEach(([metric, values]) => {
      if (values.length < 2) {
        trendAnalysis[metric] = 'stable';
        return;
      }

      const recent = values.slice(-5); // Last 5 measurements
      const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const older = values.slice(-10, -5); // Previous 5 measurements
      const olderAverage = older.length > 0 ? older.reduce((sum, val) => sum + val, 0) / older.length : average;

      const change = ((average - olderAverage) / olderAverage) * 100;

      if (Math.abs(change) < 5) {
        trendAnalysis[metric] = 'stable';
      } else if (metric === 'errorRate' || metric === 'memoryUsage') {
        // For metrics where lower is better
        trendAnalysis[metric] = change > 0 ? 'degrading' : 'improving';
      } else {
        // For metrics where higher might be better (depends on context)
        trendAnalysis[metric] = change > 0 ? 'improving' : 'degrading';
      }
    });

    return trendAnalysis;
  }

  private calculateOverallScore(metrics: DetailedPerformanceMetrics, insights: PerformanceInsight[]): number {
    let score = 100;

    // Deduct points based on insights
    insights.forEach(insight => {
      switch (insight.impact) {
        case 'high':
          score -= insight.type === 'critical' ? 15 : 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    // Additional scoring based on key metrics
    if (metrics.database.averageQueryTime > 100) score -= 20;
    if (metrics.security.authenticationLatency > 500) score -= 15;
    if (metrics.user.pageLoadTime > 3000) score -= 25;
    if (metrics.system.errorRate > 10) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(insights: PerformanceInsight[]): string[] {
    const recommendations = new Set<string>();

    // Add recommendations from insights
    insights.forEach(insight => {
      recommendations.add(insight.recommendation);
    });

    // Add general performance recommendations
    const criticalInsights = insights.filter(i => i.type === 'critical');
    if (criticalInsights.length > 0) {
      recommendations.add('Address critical performance issues immediately');
    }

    const dbInsights = insights.filter(i => i.category === 'database');
    if (dbInsights.length > 2) {
      recommendations.add('Consider comprehensive database optimization review');
    }

    const uxInsights = insights.filter(i => i.category === 'user-experience');
    if (uxInsights.length > 1) {
      recommendations.add('Implement Core Web Vitals optimization strategy');
    }

    return Array.from(recommendations);
  }

  getDetailedReport(): string {
    const analysis = this.analyzePerformance();
    
    let report = `# Performance Analysis Report\n\n`;
    report += `**Overall Score:** ${analysis.overallScore}/100\n\n`;
    
    if (analysis.insights.length > 0) {
      report += `## Performance Insights\n\n`;
      analysis.insights.forEach(insight => {
        report += `- **${insight.type.toUpperCase()}** (${insight.category}): ${insight.message}\n`;
        report += `  - Current: ${insight.currentValue}, Target: ${insight.targetValue}\n`;
        report += `  - Recommendation: ${insight.recommendation}\n\n`;
      });
    }

    if (analysis.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      analysis.recommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
    }

    return report;
  }
}

export const performanceAnalysisService = PerformanceAnalysisService.getInstance();
