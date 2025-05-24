
// Performance Validator
// Extracted from Phase1ValidationRunner for focused responsibility

import { phase1Monitor } from '../../../services/performance/Phase1Monitor';
import { ValidationReport } from './DatabaseValidator';

export class PerformanceValidator {
  async validate(report: ValidationReport): Promise<number> {
    try {
      console.log('⚡ Validating performance targets...');
      
      const metrics = phase1Monitor.getMetrics();
      const health = phase1Monitor.getHealthStatus();
      
      let score = 100;
      
      if (health.status === 'critical') {
        score -= 50;
        report.issues.push('System health is critical');
      } else if (health.status === 'warning') {
        score -= 25;
        report.issues.push('System health has warnings');
      }
      
      return Math.max(0, score);
    } catch (error) {
      report.issues.push(`Performance validation failed: ${error.message}`);
      return 0;
    }
  }
}
