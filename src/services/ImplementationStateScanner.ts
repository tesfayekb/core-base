
// Implementation State Scanner Service
// Phase 1.7: AI Context System - Scans actual implementation state from database

import { ImplementationState, PhaseState, ValidationStatus } from '@/types/ImplementationState';
import { databaseImplementationService } from './DatabaseImplementationService';

interface DetailedTask {
  taskId: string;
  taskName: string;
  status: string;
  completionPercentage: number;
  evidence: any;
  completedAt: string | null;
}

class ImplementationStateScannerService {
  constructor() {
    console.log('🔍 Implementation State Scanner initialized with database integration');
  }

  async scanImplementationState(): Promise<ImplementationState> {
    console.log('🔍 Scanning implementation state from database...');
    
    try {
      // Get phase progress and detailed tasks from database
      const [phaseProgress, detailedTasks] = await Promise.all([
        databaseImplementationService.getPhaseProgress(),
        databaseImplementationService.getDetailedTasks()
      ]);
      
      console.log('📊 Database results:', { phaseProgress, detailedTasks });
      
      // Build hierarchical phase data with tasks
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
      
      console.log('✅ Implementation state scan complete:', {
        phases: phases.length,
        overallCompletion,
        currentPhase,
        blockers: blockers.length
      });
      
      return implementationState;
      
    } catch (error) {
      console.error('❌ Implementation state scan failed:', error);
      
      // Return minimal fallback state
      return {
        phases: this.getFallbackPhases(),
        overallCompletion: 15,
        currentPhase: 1,
        blockers: ['Database connection failed - using fallback data'],
        recommendations: ['Check database connection', 'Verify implementation_progress table'],
        lastScanned: new Date().toISOString()
      };
    }
  }

  private buildHierarchicalPhases(phaseProgress: any[], detailedTasks: any[]): PhaseState[] {
    return phaseProgress.map(phaseData => {
      const phaseNumber = parseInt(phaseData.phase);
      
      // Get tasks for this phase
      const phaseTasks = detailedTasks
        .filter(task => task.phase === phaseData.phase)
        .map(task => ({
          taskId: task.task_id,
          taskName: task.task_name,
          status: task.status,
          completionPercentage: task.completion_percentage || 0,
          evidence: task.evidence || {},
          completedAt: task.completed_at
        }));

      const completedTasks = phaseTasks.filter(task => task.status === 'completed');
      const inProgressTasks = phaseTasks.filter(task => task.status === 'in_progress');
      const pendingTasks = phaseTasks.filter(task => task.status === 'pending');

      // Create detailed feature names with task IDs
      const completedFeatures = completedTasks.map(task => `${task.taskId}: ${task.taskName}`);
      const pendingFeatures = [
        ...inProgressTasks.map(task => `${task.taskId}: ${task.taskName} (${task.completionPercentage}%)`),
        ...pendingTasks.map(task => `${task.taskId}: ${task.taskName}`)
      ];

      return {
        phase: phaseNumber,
        name: phaseData.phase_name,
        completed: phaseData.completion_percentage >= 100,
        completionPercentage: Math.round(phaseData.completion_percentage),
        completedFeatures,
        pendingFeatures,
        detailedTasks: phaseTasks, // Add detailed tasks for UI expansion
        validationStatus: this.generateValidationStatus(
          phaseData.completion_percentage, 
          completedFeatures, 
          pendingFeatures
        ),
        lastUpdated: new Date().toISOString()
      };
    });
  }

  private calculateOverallCompletion(phases: PhaseState[]): number {
    if (phases.length === 0) return 0;
    
    const totalCompletion = phases.reduce((sum, phase) => sum + phase.completionPercentage, 0);
    return Math.round(totalCompletion / phases.length);
  }

  private generateValidationStatus(progress: number, completed: string[], pending: string[]): ValidationStatus {
    const warnings: string[] = [];
    const errors: string[] = [];
    
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

  private determineCurrentPhase(phases: PhaseState[]): number {
    // Find first incomplete phase
    const incompletePhase = phases.find(p => !p.completed);
    return incompletePhase ? incompletePhase.phase : phases.length;
  }

  private identifyBlockers(phases: PhaseState[]): string[] {
    const blockers: string[] = [];
    
    phases.forEach(phase => {
      if (phase.validationStatus.errors.length > 0) {
        blockers.push(...phase.validationStatus.errors);
      }
      
      // Add phase-specific blockers
      if (phase.completionPercentage < 10 && phase.phase === 1) {
        blockers.push('Foundation phase not started');
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
    
    // Add general recommendations
    if (phases[0]?.completionPercentage < 50) {
      recommendations.push('Complete foundation phase first');
    }
    
    recommendations.push('Review implementation progress regularly');
    
    return recommendations;
  }

  private getFallbackPhases(): PhaseState[] {
    return [
      {
        phase: 1,
        name: 'Foundation',
        completed: false,
        completionPercentage: 75,
        completedFeatures: ['1.1: Project Setup', '1.2: Database Foundation', '1.3: Authentication'],
        pendingFeatures: ['1.7: AI Context Management (70%)'],
        validationStatus: {
          passed: false,
          errors: [],
          warnings: ['Using fallback data'],
          score: 75
        },
        lastUpdated: new Date().toISOString()
      }
    ];
  }
}

export const implementationStateScanner = new ImplementationStateScannerService();
