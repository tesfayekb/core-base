
import { crossSystemValidator, CrossSystemValidationReport } from './CrossSystemValidator';
import { detailedMetricsCollector } from '../performance/DetailedMetricsCollector';

export interface SystemHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100
  lastValidation: string;
  activeIssues: string[];
  systemMetrics: {
    performance: number;
    security: number;
    integration: number;
    dataCollection: number;
  };
}

export class SystemHealthMonitor {
  private static instance: SystemHealthMonitor;
  private lastReport: CrossSystemValidationReport | null = null;
  private healthHistory: SystemHealthStatus[] = [];

  static getInstance(): SystemHealthMonitor {
    if (!SystemHealthMonitor.instance) {
      SystemHealthMonitor.instance = new SystemHealthMonitor();
    }
    return SystemHealthMonitor.instance;
  }

  private constructor() {
    this.startHealthMonitoring();
  }

  async getCurrentHealth(): Promise<SystemHealthStatus> {
    if (!this.lastReport) {
      this.lastReport = await crossSystemValidator.validateAllSystems();
    }

    return this.calculateHealthStatus(this.lastReport);
  }

  async refreshHealth(): Promise<SystemHealthStatus> {
    this.lastReport = await crossSystemValidator.validateAllSystems();
    const health = this.calculateHealthStatus(this.lastReport);
    
    // Store in history
    this.healthHistory.push(health);
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift();
    }

    return health;
  }

  getHealthTrends(): SystemHealthStatus[] {
    return [...this.healthHistory];
  }

  getSystemRecommendations(): string[] {
    if (!this.lastReport) return ['Run system validation to get recommendations'];
    return this.lastReport.recommendations;
  }

  private calculateHealthStatus(report: CrossSystemValidationReport): SystemHealthStatus {
    const systemScores = {
      performance: this.calculateSystemScore(report.results.find(r => r.system === 'Performance Monitoring')),
      security: this.calculateSystemScore(report.results.find(r => r.system === 'Security Infrastructure')),
      integration: this.calculateSystemScore(report.results.find(r => r.system === 'System Integration')),
      dataCollection: this.calculateSystemScore(report.results.find(r => r.system === 'Data Collection'))
    };

    const overallScore = Object.values(systemScores).reduce((sum, score) => sum + score, 0) / 4;
    const activeIssues = report.results.flatMap(r => r.issues);

    let status: 'healthy' | 'warning' | 'critical';
    if (overallScore >= 80 && activeIssues.length === 0) {
      status = 'healthy';
    } else if (overallScore >= 60 && activeIssues.length < 5) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      score: Math.round(overallScore),
      lastValidation: report.overall.timestamp,
      activeIssues,
      systemMetrics: systemScores
    };
  }

  private calculateSystemScore(result: any): number {
    if (!result) return 0;
    
    if (result.passed) return 100;
    
    // Reduce score based on number of issues
    const baseScore = 100;
    const penaltyPerIssue = 15;
    const score = Math.max(0, baseScore - (result.issues.length * penaltyPerIssue));
    
    return score;
  }

  private startHealthMonitoring(): void {
    // Initial health check
    this.refreshHealth();

    // Refresh every 5 minutes
    setInterval(() => {
      this.refreshHealth().catch(error => {
        console.error('Health monitoring error:', error);
      });
    }, 300000);

    console.log('🏥 System health monitoring started');
  }

  async getDetailedDiagnostics(): Promise<Record<string, any>> {
    const health = await this.getCurrentHealth();
    const performanceMetrics = detailedMetricsCollector.getLatestMetrics();
    const performanceInsights = detailedMetricsCollector.getPerformanceInsights();

    return {
      systemHealth: health,
      performanceMetrics: performanceMetrics ? {
        system: performanceMetrics.system,
        database: performanceMetrics.database,
        security: performanceMetrics.security,
        memory: performanceMetrics.memory
      } : null,
      performanceInsights,
      integrationMatrix: this.lastReport?.integrationMatrix || {},
      validationHistory: this.healthHistory.slice(-10) // Last 10 health checks
    };
  }
}

export const systemHealthMonitor = SystemHealthMonitor.getInstance();
