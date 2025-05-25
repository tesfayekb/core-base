
// Implementation State Scanner
// Enhanced multi-phase implementation scanner with database integration

import { ImplementationState, PhaseState, ValidationStatus } from '@/types/ImplementationState';
import { realDocumentParser } from './RealDocumentParser';
import { realCodebaseAnalyzer } from './RealCodebaseAnalyzer';
import { supabase } from '@/integrations/supabase/client';

class ImplementationStateScannerService {
  async scanImplementationState(): Promise<ImplementationState> {
    console.log('🔍 Scanning enhanced multi-phase implementation state...');
    
    try {
      // Parse all phase documentation
      const phaseDocuments = await realDocumentParser.parseImplementationDocs();
      
      // Analyze codebase against all phases
      const codebaseAnalysis = await realCodebaseAnalyzer.analyzeCodebase();
      
      // Get progress from database
      const databaseProgress = await this.getProgressFromDatabase();
      
      // Generate enhanced phase analysis
      const phases = await this.generateEnhancedPhaseAnalysis(phaseDocuments, codebaseAnalysis, databaseProgress);
      const overall = this.calculateOverallProgress(phases);
      
      return {
        phases,
        overallCompletion: overall.completion,
        currentPhase: overall.currentPhase,
        blockers: overall.blockers,
        recommendations: this.generateEnhancedRecommendations(phases, codebaseAnalysis),
        lastScanned: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Enhanced implementation scan failed:', error);
      return this.getEmptyState();
    }
  }

  private async getProgressFromDatabase(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('implementation_progress')
        .select('*')
        .order('phase', { ascending: true });
      
      if (error) {
        console.error('❌ Failed to fetch progress from database:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Database progress fetch failed:', error);
      return [];
    }
  }

  private async generateEnhancedPhaseAnalysis(
    phaseDocuments: any[], 
    codebaseAnalysis: any, 
    databaseProgress: any[]
  ): Promise<PhaseState[]> {
    const now = new Date().toISOString();
    
    // Group features by major phase
    const phaseGroups = this.groupFeaturesByPhase(codebaseAnalysis.features);
    
    const phases: PhaseState[] = [];
    
    // Process each major phase (1, 2, 3, 4)
    for (let majorPhase = 1; majorPhase <= 4; majorPhase++) {
      const phaseKey = majorPhase.toString();
      const phaseFeatures = phaseGroups[phaseKey] || [];
      const phaseProgress = databaseProgress.filter(p => p.phase.startsWith(phaseKey));
      
      const phaseName = this.getPhaseName(majorPhase);
      const completedFeatures = this.extractCompletedFeatures(phaseFeatures, phaseProgress);
      const pendingFeatures = this.extractPendingFeatures(phaseFeatures, phaseProgress);
      const completionPercentage = this.calculatePhaseCompletion(phaseFeatures);
      const isCompleted = completionPercentage >= 80;
      
      const validationStatus = this.generatePhaseValidationStatus(
        phaseFeatures, 
        phaseProgress, 
        completionPercentage
      );
      
      phases.push({
        phase: majorPhase,
        name: phaseName,
        completed: isCompleted,
        completionPercentage,
        completedFeatures,
        pendingFeatures,
        validationStatus,
        lastUpdated: now
      });
    }
    
    return phases;
  }

  private groupFeaturesByPhase(features: any[]): { [phase: string]: any[] } {
    const groups: { [phase: string]: any[] } = {};
    
    features.forEach(feature => {
      const majorPhase = feature.phase.split('.')[0];
      if (!groups[majorPhase]) {
        groups[majorPhase] = [];
      }
      groups[majorPhase].push(feature);
    });
    
    return groups;
  }

  private getPhaseName(phase: number): string {
    const names = {
      1: 'Foundation',
      2: 'Core Features', 
      3: 'Advanced Features',
      4: 'Production Readiness'
    };
    return names[phase as keyof typeof names] || `Phase ${phase}`;
  }

  private extractCompletedFeatures(phaseFeatures: any[], phaseProgress: any[]): string[] {
    const completed: string[] = [];
    
    phaseFeatures.forEach(feature => {
      if (feature.implemented) {
        completed.push(feature.name);
        completed.push(...feature.requirementsMet.slice(0, 2));
      }
    });
    
    // Add from database progress
    const completedFromDB = phaseProgress
      .filter(p => p.status === 'completed')
      .map(p => p.task_name);
    
    completed.push(...completedFromDB);
    
    return [...new Set(completed)].slice(0, 8); // Limit for UI
  }

  private extractPendingFeatures(phaseFeatures: any[], phaseProgress: any[]): string[] {
    const pending: string[] = [];
    
    phaseFeatures.forEach(feature => {
      if (!feature.implemented) {
        pending.push(...feature.requirementsPending.slice(0, 3));
      }
    });
    
    // Add from database progress
    const pendingFromDB = phaseProgress
      .filter(p => p.status === 'pending')
      .map(p => p.task_name);
    
    pending.push(...pendingFromDB);
    
    return [...new Set(pending)].slice(0, 5); // Limit for UI
  }

  private calculatePhaseCompletion(phaseFeatures: any[]): number {
    if (phaseFeatures.length === 0) return 0;
    
    const totalConfidence = phaseFeatures.reduce((sum, feature) => sum + feature.confidence, 0);
    return Math.round(totalConfidence / phaseFeatures.length);
  }

  private generatePhaseValidationStatus(
    phaseFeatures: any[], 
    phaseProgress: any[], 
    completion: number
  ): ValidationStatus {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check for incomplete critical features
    const incompleteFeatures = phaseFeatures.filter(f => !f.implemented);
    if (incompleteFeatures.length > 0 && completion > 30) {
      warnings.push(`${incompleteFeatures.length} features still need implementation`);
    }
    
    // Check for blocked tasks
    const blockedTasks = phaseProgress.filter(p => p.status === 'blocked');
    if (blockedTasks.length > 0) {
      errors.push(`${blockedTasks.length} tasks are blocked`);
    }
    
    // Check completion threshold
    if (completion < 30) {
      errors.push(`Phase completion too low (${completion}%)`);
    } else if (completion < 70) {
      warnings.push(`Phase needs more work (${completion}%)`);
    }
    
    return {
      passed: completion >= 80 && errors.length === 0,
      warnings,
      errors,
      score: completion
    };
  }

  private calculateOverallProgress(phases: PhaseState[]): {
    completion: number;
    currentPhase: number;
    blockers: string[];
  } {
    let totalCompletion = 0;
    let currentPhase = 1;
    const blockers: string[] = [];

    phases.forEach((phase, index) => {
      totalCompletion += phase.completionPercentage;
      
      // Current phase is the first incomplete phase
      if (phase.completed && currentPhase === index + 1) {
        currentPhase = index + 2;
      }
      
      // Collect blockers from validation errors
      if (phase.validationStatus.errors.length > 0) {
        blockers.push(...phase.validationStatus.errors);
      }
    });

    const completion = Math.round(totalCompletion / phases.length);

    return { 
      completion, 
      currentPhase: Math.min(currentPhase, phases.length), 
      blockers: [...new Set(blockers)]
    };
  }

  private generateEnhancedRecommendations(phases: PhaseState[], codebaseAnalysis: any): string[] {
    const recommendations: string[] = [];

    // Find the current phase and provide specific guidance
    const incompletePhase = phases.find(p => !p.completed);
    if (incompletePhase) {
      recommendations.push(`🎯 Focus on completing Phase ${incompletePhase.phase}: ${incompletePhase.name}`);
      
      if (incompletePhase.pendingFeatures.length > 0) {
        recommendations.push(`📋 Next task: ${incompletePhase.pendingFeatures[0]}`);
      }
    }

    // Phase-specific recommendations
    const completedPhases = phases.filter(p => p.completed).length;
    
    if (completedPhases === 0) {
      recommendations.push('🏗️ Start with Phase 1 foundation - critical for all other features');
    } else if (completedPhases === 1) {
      recommendations.push('🔐 Phase 1 complete! Move to Phase 2 core features');
    } else if (completedPhases === 2) {
      recommendations.push('🚀 Strong foundation! Ready for Phase 3 advanced features');
    } else if (completedPhases === 3) {
      recommendations.push('⭐ Excellent progress! Phase 4 will make you production-ready');
    }

    // Add specific implementation guidance
    if (codebaseAnalysis.phaseProgress) {
      Object.entries(codebaseAnalysis.phaseProgress).forEach(([phase, progress]) => {
        if ((progress as number) < 50) {
          recommendations.push(`⚠️ Phase ${phase} needs attention (${progress}% complete)`);
        }
      });
    }

    recommendations.push('📚 Follow phase documentation in src/docs/implementation/');
    recommendations.push('✅ Use database progress tracking for accurate monitoring');

    return recommendations;
  }

  private getEmptyState(): ImplementationState {
    return {
      phases: [],
      overallCompletion: 0,
      currentPhase: 1,
      blockers: ['Enhanced multi-phase scanning failed'],
      recommendations: [
        'Check database connectivity for progress tracking',
        'Verify phase documentation exists',
        'Review console for specific errors'
      ],
      lastScanned: new Date().toISOString()
    };
  }
}

export const implementationStateScanner = new ImplementationStateScannerService();
