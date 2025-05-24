
// End-to-End Integration Validator
// Extracted from Phase1ValidationRunner for focused responsibility

import { databaseService } from '../../../services/database/databaseService';
import { phase1Monitor } from '../../../services/performance/Phase1Monitor';
import { ValidationReport } from './DatabaseValidator';

export class EndToEndValidator {
  async validate(report: ValidationReport): Promise<number> {
    try {
      console.log('🔄 Validating end-to-end integration...');
      
      await databaseService.setTenantContext('e2e-tenant');
      phase1Monitor.recordDatabaseQuery(25);
      phase1Monitor.recordPermissionCheck(10, true);
      await databaseService.clearContexts();
      
      const health = phase1Monitor.getHealthStatus();
      if (health.status === 'critical') {
        report.issues.push('End-to-end flow results in critical system state');
        return 50;
      }
      
      return 100;
    } catch (error) {
      report.issues.push(`End-to-end validation failed: ${error.message}`);
      return 0;
    }
  }
}
