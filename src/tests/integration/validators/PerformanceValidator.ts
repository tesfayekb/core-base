
// Performance Validator - Enhanced
// Enhanced with dependency resolution, cache warming, and proactive alerting validation

import { phase1Monitor } from '../../../services/performance/Phase1Monitor';
import { granularDependencyResolver } from '../../../services/rbac/GranularDependencyResolver';
import { cacheWarmingService } from '../../../services/caching/CacheWarmingService';
import { proactiveAlertingService } from '../../../services/monitoring/ProactiveAlertingService';
import { ValidationReport } from './DatabaseValidator';

export class PerformanceValidator {
  async validate(report: ValidationReport): Promise<number> {
    try {
      console.log('⚡ Validating enhanced performance targets...');
      
      let score = 100;
      
      // Test basic performance metrics
      const metrics = phase1Monitor.getMetrics();
      const health = phase1Monitor.getHealthStatus();
      
      if (health.status === 'critical') {
        score -= 50;
        report.issues.push('System health is critical');
      } else if (health.status === 'warning') {
        score -= 25;
        report.issues.push('System health has warnings');
      }

      // Test granular dependency resolution
      await this.validateDependencyResolution(report);
      
      // Test cache warming capabilities
      const warmupScore = await this.validateCacheWarming(report);
      if (warmupScore < 100) {
        score -= (100 - warmupScore) * 0.2; // 20% weight
      }

      // Test proactive alerting system
      const alertingScore = await this.validateProactiveAlerting(report);
      if (alertingScore < 100) {
        score -= (100 - alertingScore) * 0.3; // 30% weight
      }

      // Test enhanced performance metrics
      if (metrics.dependencies.resolutionCount === 0) {
        report.issues.push('Dependency resolution system not active');
        score -= 10;
      }

      if (metrics.cache.warmupStatus === 'error') {
        report.issues.push('Cache warming system has errors');
        score -= 15;
      }

      if (metrics.alerts.activeAlerts > 5) {
        report.issues.push('Too many active alerts indicating system stress');
        score -= 20;
      }

      return Math.max(0, score);
    } catch (error) {
      report.issues.push(`Enhanced performance validation failed: ${error.message}`);
      return 0;
    }
  }

  private async validateDependencyResolution(report: ValidationReport): Promise<void> {
    try {
      // Test dependency resolution with mock permission check
      const mockPermissionCheck = async (userId: string, permission: string) => {
        return permission.includes('view'); // Mock: grant view permissions
      };

      const result = await granularDependencyResolver.resolvePermissionWithDependencies(
        'test-user',
        'users:update',
        mockPermissionCheck
      );

      if (!result.granted) {
        report.issues.push('Dependency resolution not working correctly');
      } else {
        console.log('✅ Dependency resolution validated successfully');
      }

      // Record the dependency resolution
      phase1Monitor.recordDependencyResolution(result.resolutionPath.length);

    } catch (error) {
      report.issues.push(`Dependency resolution validation failed: ${error.message}`);
    }
  }

  private async validateCacheWarming(report: ValidationReport): Promise<number> {
    try {
      console.log('🔥 Testing cache warming capabilities...');
      
      // Test individual strategy
      const userPermResult = await cacheWarmingService.executeWarmupStrategy('user-permissions');
      
      if (!userPermResult.success) {
        report.issues.push('Cache warming strategy failed');
        return 50;
      }

      if (userPermResult.itemsWarmed === 0) {
        report.issues.push('Cache warming produced no results');
        return 70;
      }

      if (userPermResult.duration > 5000) {
        report.issues.push('Cache warming too slow');
        return 80;
      }

      console.log('✅ Cache warming validated successfully');
      return 100;

    } catch (error) {
      report.issues.push(`Cache warming validation failed: ${error.message}`);
      return 0;
    }
  }

  private async validateProactiveAlerting(report: ValidationReport): Promise<number> {
    try {
      console.log('🔔 Testing proactive alerting system...');
      
      // Check if alerting service is active
      const alertMetrics = proactiveAlertingService.getAlertMetrics();
      
      // Get current alerts
      const activeAlerts = proactiveAlertingService.getActiveAlerts();
      
      // Test alert acknowledgment (if any alerts exist)
      if (activeAlerts.length > 0) {
        const testAlert = activeAlerts[0];
        const ackResult = proactiveAlertingService.acknowledgeAlert(testAlert.id);
        
        if (!ackResult) {
          report.issues.push('Alert acknowledgment system not working');
          return 70;
        }
      }

      // Validate alert metrics are being tracked
      if (alertMetrics.totalAlerts === undefined) {
        report.issues.push('Alert metrics not properly tracked');
        return 80;
      }

      console.log('✅ Proactive alerting validated successfully');
      return 100;

    } catch (error) {
      report.issues.push(`Proactive alerting validation failed: ${error.message}`);
      return 0;
    }
  }
}
