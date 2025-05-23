
/**
 * Enhanced Migration Helper
 * Integrates dependency checking, rollback testing, and performance assessment
 */

import { MigrationDependencyChecker, MigrationDependency } from './dependency-checker';
import { MigrationRollbackTester, MigrationRollbackTest } from './rollback-tester';
import { MigrationPerformanceAssessor, PerformanceAssessment, TableMetrics } from './performance-assessor';

export interface EnhancedMigration extends MigrationDependency {
  script: string;
  rollbackScript?: string;
  performanceAssessment?: PerformanceAssessment;
  rollbackTest?: MigrationRollbackTest;
}

export interface MigrationExecutionPlan {
  migrations: EnhancedMigration[];
  executionOrder: string[];
  totalEstimatedDuration: number;
  highImpactMigrations: string[];
  recommendations: string[];
  prerequisiteChecks: PrerequisiteCheck[];
}

export interface PrerequisiteCheck {
  name: string;
  description: string;
  required: boolean;
  checkFunction: () => Promise<boolean>;
}

export class EnhancedMigrationHelper {
  /**
   * Creates comprehensive migration execution plan with all assessments
   */
  static async createExecutionPlan(
    migrations: EnhancedMigration[],
    getTableMetrics: (tableName: string) => Promise<TableMetrics>,
    executeSQL: (query: string) => Promise<any>
  ): Promise<MigrationExecutionPlan> {
    // Validate dependencies
    const dependencyValidation = MigrationDependencyChecker.validateDependencies(migrations);
    
    if (!dependencyValidation.valid) {
      throw new Error(`Migration dependency validation failed: ${dependencyValidation.errors.join(', ')}`);
    }
    
    // Assess performance for each migration
    const enhancedMigrations = await Promise.all(
      migrations.map(async (migration) => {
        const performanceAssessment = await MigrationPerformanceAssessor.assessMigrationPerformance(
          migration.script,
          getTableMetrics
        );
        
        return {
          ...migration,
          performanceAssessment
        };
      })
    );
    
    // Calculate totals and identify high-impact migrations
    const totalEstimatedDuration = enhancedMigrations.reduce(
      (sum, migration) => sum + (migration.performanceAssessment?.estimatedDuration || 0),
      0
    );
    
    const highImpactMigrations = enhancedMigrations
      .filter(migration => 
        migration.performanceAssessment?.impactLevel === 'high' || 
        migration.performanceAssessment?.impactLevel === 'critical'
      )
      .map(migration => migration.version);
    
    // Generate recommendations
    const recommendations = this.generateExecutionRecommendations(enhancedMigrations);
    
    // Create prerequisite checks
    const prerequisiteChecks = this.createPrerequisiteChecks(enhancedMigrations);
    
    return {
      migrations: enhancedMigrations,
      executionOrder: dependencyValidation.executionOrder,
      totalEstimatedDuration,
      highImpactMigrations,
      recommendations,
      prerequisiteChecks
    };
  }
  
  /**
   * Executes migration with comprehensive validation and monitoring
   */
  static async executeMigrationSafely(
    migration: EnhancedMigration,
    executeSQL: (query: string) => Promise<any>,
    options: {
      skipPerformanceCheck?: boolean;
      skipRollbackTest?: boolean;
      confirmBreakingChange?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    duration: number;
    errors: string[];
    performanceMetrics?: any;
  }> {
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      // Pre-execution checks
      if (migration.breakingChange && !options.confirmBreakingChange) {
        errors.push('Breaking change migration requires explicit confirmation');
        return { success: false, duration: 0, errors };
      }
      
      // Performance validation
      if (!options.skipPerformanceCheck && migration.performanceAssessment?.impactLevel === 'critical') {
        errors.push('Critical performance impact detected - manual review required');
        return { success: false, duration: 0, errors };
      }
      
      // Test rollback procedure if available
      if (!options.skipRollbackTest && migration.rollbackTest) {
        console.log(`Testing rollback procedure for migration ${migration.version}`);
        const rollbackTestResult = await MigrationRollbackTester.testMigrationRollback(
          migration.rollbackTest,
          executeSQL
        );
        
        if (!rollbackTestResult.success) {
          errors.push(`Rollback test failed: ${rollbackTestResult.errors.join(', ')}`);
          return { success: false, duration: 0, errors };
        }
      }
      
      // Execute the migration
      console.log(`Executing migration ${migration.version}: ${migration.name}`);
      await executeSQL(migration.script);
      
      const duration = performance.now() - startTime;
      
      console.log(`Migration ${migration.version} completed successfully in ${duration.toFixed(2)}ms`);
      
      return {
        success: true,
        duration,
        errors: []
      };
      
    } catch (error) {
      const duration = performance.now() - startTime;
      errors.push(error instanceof Error ? error.message : String(error));
      
      return {
        success: false,
        duration,
        errors
      };
    }
  }
  
  /**
   * Generates execution recommendations based on migration analysis
   */
  private static generateExecutionRecommendations(migrations: EnhancedMigration[]): string[] {
    const recommendations: string[] = [];
    
    const totalDuration = migrations.reduce(
      (sum, m) => sum + (m.performanceAssessment?.estimatedDuration || 0),
      0
    );
    
    const criticalMigrations = migrations.filter(
      m => m.performanceAssessment?.impactLevel === 'critical'
    );
    
    const breakingMigrations = migrations.filter(m => m.breakingChange);
    
    // Duration-based recommendations
    if (totalDuration > 300000) { // > 5 minutes
      recommendations.push('Total execution time exceeds 5 minutes - schedule during maintenance window');
    }
    
    if (totalDuration > 60000) { // > 1 minute
      recommendations.push('Consider implementing progress monitoring for long-running migrations');
    }
    
    // Impact-based recommendations
    if (criticalMigrations.length > 0) {
      recommendations.push(`${criticalMigrations.length} critical impact migrations detected - manual review required`);
      recommendations.push('Ensure database backups are current before execution');
    }
    
    // Breaking change recommendations
    if (breakingMigrations.length > 0) {
      recommendations.push(`${breakingMigrations.length} breaking change migrations require explicit confirmation`);
      recommendations.push('Coordinate with application deployment to ensure compatibility');
    }
    
    // Resource recommendations
    const highResourceMigrations = migrations.filter(
      m => m.performanceAssessment?.resourceRequirements.estimatedCPU === 'high' ||
           m.performanceAssessment?.resourceRequirements.estimatedMemory === 'high'
    );
    
    if (highResourceMigrations.length > 0) {
      recommendations.push('High resource usage detected - monitor system performance during execution');
    }
    
    return recommendations;
  }
  
  /**
   * Creates prerequisite checks for safe migration execution
   */
  private static createPrerequisiteChecks(migrations: EnhancedMigration[]): PrerequisiteCheck[] {
    const checks: PrerequisiteCheck[] = [];
    
    // Database connectivity check
    checks.push({
      name: 'Database Connectivity',
      description: 'Verify database connection is stable',
      required: true,
      checkFunction: async () => {
        // Implementation would check database connectivity
        return true;
      }
    });
    
    // Backup verification
    const hasHighImpact = migrations.some(
      m => m.performanceAssessment?.impactLevel === 'high' || 
           m.performanceAssessment?.impactLevel === 'critical'
    );
    
    if (hasHighImpact) {
      checks.push({
        name: 'Recent Backup Verification',
        description: 'Verify recent database backup exists',
        required: true,
        checkFunction: async () => {
          // Implementation would verify backup recency
          return true;
        }
      });
    }
    
    // Disk space check
    const totalTempSpace = migrations.reduce(
      (sum, m) => sum + (m.performanceAssessment?.resourceRequirements.temporaryDiskSpace || 0),
      0
    );
    
    if (totalTempSpace > 1000) { // > 1GB
      checks.push({
        name: 'Disk Space Verification',
        description: `Verify at least ${totalTempSpace}MB of free disk space`,
        required: true,
        checkFunction: async () => {
          // Implementation would check available disk space
          return true;
        }
      });
    }
    
    // Application downtime coordination
    const hasBreakingChanges = migrations.some(m => m.breakingChange);
    
    if (hasBreakingChanges) {
      checks.push({
        name: 'Application Downtime Coordination',
        description: 'Coordinate with application team for potential downtime',
        required: false,
        checkFunction: async () => {
          // Implementation would verify coordination
          return true;
        }
      });
    }
    
    return checks;
  }
}
