// Enhanced Implementation State Scanner with Real Database Integration
// Phase 1.7: AI Context System

import { ImplementationState, PhaseState } from '@/types/ImplementationState';
import { databaseImplementationService } from './DatabaseImplementationService';
import { codebaseScanner } from './CodebaseScanner';

class EnhancedImplementationStateScannerService {
  constructor() {
    console.log('🔍 Enhanced Implementation State Scanner initialized with real scanning capability');
  }

  async scanImplementationState(forceRescan: boolean = false): Promise<ImplementationState> {
    console.log('🔍 Starting enhanced implementation state scan...');
    
    try {
      // Perform real codebase scan and update database if requested
      if (forceRescan) {
        console.log('🔄 Force rescan requested - analyzing codebase...');
        await codebaseScanner.scanAndUpdateDatabase();
      }
      
      // Get updated data from database
      const [phaseProgress, detailedTasks] = await Promise.all([
        databaseImplementationService.getPhaseProgress(),
        databaseImplementationService.getDetailedTasks()
      ]);
      
      console.log('📊 Database results after scan:', { 
        phaseProgress: phaseProgress.length, 
        detailedTasks: detailedTasks.length 
      });
      
      // Build hierarchical phase data with real scan results
      const phases: PhaseState[] = this.buildHierarchicalPhases(phaseProgress, detailedTasks);
      
      const overallCompletion = this.calculateOverallCompletion(phases);
      const currentPhase = this.determineCurrentPhase(phases);
      const blockers = this.identifyBlockers(phases);
      const recommendations = this.generateRecommendations(phases, currentPhase);
      
      const implementationState: ImplementationState = {
        phases,
        overallCompletion,
        currentPhase,
        blockers,
        recommendations,
        lastScanned: new Date().toISOString()
      };
      
      console.log('✅ Enhanced implementation state scan complete:', {
        phases: phases.length,
        overallCompletion,
        currentPhase,
        blockers: blockers.length,
        totalTasks: detailedTasks.length,
        dataSource: forceRescan ? 'fresh_scan' : 'database'
      });
      
      return implementationState;
      
    } catch (error) {
      console.error('❌ Enhanced implementation state scan failed:', error);
      
      // Return minimal fallback state
      return {
        phases: this.getFallbackPhases(),
        overallCompletion: 15,
        currentPhase: 1,
        blockers: ['Enhanced scanner failed - using fallback data'],
        recommendations: ['Try force rescan', 'Check database connection'],
        lastScanned: new Date().toISOString()
      };
    }
  }

  private buildHierarchicalPhases(phaseProgress: any[], detailedTasks: any[]): PhaseState[] {
    return phaseProgress.map(phaseData => {
      const phaseNumber = parseInt(phaseData.phase);
      
      // Get tasks for this phase with real scan data
      const phaseTasks = detailedTasks
        .filter(task => task.phase === phaseData.phase)
        .map(task => ({
          taskId: task.task_id,
          taskName: task.task_name,
          status: task.status,
          completionPercentage: task.completion_percentage || 0,
          evidence: task.evidence || {},
          completedAt: task.completed_at,
          // Add scan-specific data
          filesAnalyzed: task.evidence?.files_analyzed || [],
          featuresDetected: task.evidence?.features_detected || [],
          scanTimestamp: task.evidence?.scan_timestamp
        }));

      const completedTasks = phaseTasks.filter(task => task.status === 'completed');
      const inProgressTasks = phaseTasks.filter(task => task.status === 'in_progress');
      const pendingTasks = phaseTasks.filter(task => task.status === 'pending');

      // Create detailed feature names with scan evidence
      const completedFeatures = completedTasks.map(task => {
        const features = task.featuresDetected?.slice(0, 2).join(', ') || '';
        return `${task.taskId}: ${task.taskName}${features ? ` (${features})` : ''}`;
      });
      
      const pendingFeatures = [
        ...inProgressTasks.map(task => {
          const evidence = task.evidence?.scanner_version ? ' (scanned)' : '';
          return `${task.taskId}: ${task.taskName} (${task.completionPercentage}%${evidence})`;
        }),
        ...pendingTasks.map(task => `${task.taskId}: ${task.taskName}`)
      ];

      return {
        phase: phaseNumber,
        name: phaseData.phase_name,
        completed: phaseData.completion_percentage >= 100,
        completionPercentage: Math.round(phaseData.completion_percentage),
        completedFeatures,
        pendingFeatures,
        detailedTasks: phaseTasks,
        validationStatus: this.generateValidationStatus(
          phaseData.completion_percentage, 
          completedFeatures, 
          pendingFeatures,
          phaseTasks
        ),
        lastUpdated: new Date().toISOString()
      };
    });
  }

  private generateValidationStatus(progress: number, completed: string[], pending: string[], tasks: any[]) {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check if tasks have been scanned
    const scannedTasks = tasks.filter(task => task.evidence?.scanner_version);
    const unscannedTasks = tasks.filter(task => !task.evidence?.scanner_version);
    
    if (unscannedTasks.length > 0) {
      warnings.push(`${unscannedTasks.length} tasks not yet scanned by codebase analyzer`);
    }
    
    if (progress < 25) {
      warnings.push('Phase not started');
    } else if (progress < 50) {
      warnings.push('Phase in early development');
    } else if (progress < 80) {
      warnings.push('Phase nearing completion');
    }
    
    if (pending.length > completed.length && progress > 50) {
      warnings.push('More features pending than completed');
    }
    
    return {
      passed: progress >= 80,
      errors,
      warnings,
      score: progress
    };
  }

  private calculateOverallCompletion(phases: PhaseState[]): number {
    if (phases.length === 0) return 0;
    
    const totalCompletion = phases.reduce((sum, phase) => sum + phase.completionPercentage, 0);
    return Math.round(totalCompletion / phases.length);
  }

  private determineCurrentPhase(phases: PhaseState[]): number {
    const incompletePhase = phases.find(p => !p.completed);
    return incompletePhase ? incompletePhase.phase : phases.length;
  }

  private identifyBlockers(phases: PhaseState[]): string[] {
    const blockers: string[] = [];
    
    phases.forEach(phase => {
      if (phase.validationStatus.errors.length > 0) {
        blockers.push(...phase.validationStatus.errors);
      }
    });
    
    return blockers;
  }

  private generateRecommendations(phases: PhaseState[], currentPhase: number): string[] {
    const recommendations: string[] = [];
    
    const currentPhaseData = phases.find(p => p.phase === currentPhase);
    if (currentPhaseData && currentPhaseData.pendingFeatures.length > 0) {
      recommendations.push(`Focus on ${currentPhaseData.name}: ${currentPhaseData.pendingFeatures[0]}`);
    }
    
    recommendations.push('Use force rescan to update progress from codebase');
    
    return recommendations;
  }

  private getFallbackPhases(): PhaseState[] {
    return [
      {
        phase: 1,
        name: 'Foundation',
        completed: false,
        completionPercentage: 75,
        completedFeatures: ['1.1: Project Setup', '1.2: Database Foundation'],
        pendingFeatures: ['1.7: AI Context Management (scanning...)'],
        validationStatus: {
          passed: false,
          errors: [],
          warnings: ['Using fallback data - scanner not available'],
          score: 75
        },
        lastUpdated: new Date().toISOString()
      }
    ];
  }
}

export const enhancedImplementationStateScanner = new EnhancedImplementationStateScannerService();
