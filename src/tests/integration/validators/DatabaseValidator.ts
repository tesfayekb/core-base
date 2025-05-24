
// Database Foundation Validator
// Extracted from Phase1ValidationRunner for focused responsibility

import { databaseService } from '../../../services/database/databaseService';

export interface ValidationReport {
  timestamp: Date;
  overallScore: number;
  componentScores: {
    database: number;
    rbac: number;
    multiTenant: number;
    audit: number;
    performance: number;
    endToEnd: number;
  };
  issues: string[];
  recommendations: string[];
  readyForNextPhase: boolean;
}

export class DatabaseValidator {
  async validate(report: ValidationReport): Promise<number> {
    try {
      console.log('🗄️ Validating database foundation...');
      
      const isConnected = await databaseService.testConnection();
      if (!isConnected) {
        report.issues.push('Database connection failed');
        return 0;
      }

      await databaseService.initialize('validation');
      const status = await databaseService.getStatus();
      
      if (!status || !status.totalMigrations) {
        report.issues.push('Database migrations not properly initialized');
        return 50;
      }

      return 100;
    } catch (error) {
      report.issues.push(`Database validation failed: ${error.message}`);
      return 0;
    }
  }
}
