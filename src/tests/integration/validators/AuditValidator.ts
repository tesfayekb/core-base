
// Audit Foundation Validator
// Extracted from Phase1ValidationRunner for focused responsibility

import { phase1Monitor } from '../../../services/performance/Phase1Monitor';
import { ValidationReport } from './DatabaseValidator';

export class AuditValidator {
  async validate(report: ValidationReport): Promise<number> {
    try {
      console.log('📝 Validating audit foundation...');
      
      phase1Monitor.recordAuditEvent(3);
      const metrics = phase1Monitor.getMetrics();
      
      if (metrics.audit.eventsLogged === 0) {
        report.issues.push('Audit event logging not working');
        return 0;
      }
      
      return 100;
    } catch (error) {
      report.issues.push(`Audit validation failed: ${error.message}`);
      return 0;
    }
  }
}
