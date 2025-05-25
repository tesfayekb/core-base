
// Implementation State Scanner Service
// Phase 1.7: AI Context System - Scans actual implementation state

import { ImplementationState, PhaseState, ValidationStatus } from '@/types/ImplementationState';
import { realDocumentParser } from './RealDocumentParser';
import { realCodebaseAnalyzer } from './RealCodebaseAnalyzer';

class ImplementationStateScannerService {
  constructor() {
    console.log('🔍 Implementation State Scanner initialized');
  }

  async scanImplementationState(): Promise<ImplementationState> {
    console.log('🔍 Scanning enhanced multi-phase implementation state...');
    
    try {
      // Parse documentation to get phase structure
      const phaseDocuments = await realDocumentParser.parseImplementationDocs();
      
      // Analyze codebase for actual implementation progress
      const codebaseAnalysis = await realCodebaseAnalyzer.analyzeCodebase();
      
      // Combine documentation structure with actual implementation progress
      const phases: PhaseState[] = this.combinePhaseData(phaseDocuments, codebaseAnalysis);
      
      const overallCompletion = codebaseAnalysis.overallProgress;
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
        blockers: ['Scanner initialization failed'],
        recommendations: ['Check system configuration', 'Verify file access'],
        lastScanned: new Date().toISOString()
      };
    }
  }

  private combinePhaseData(phaseDocuments: any[], codebaseAnalysis: any): PhaseState[] {
    return phaseDocuments.map(doc => {
      const phaseNumber = parseInt(doc.phase);
      const phaseProgress = codebaseAnalysis.phaseProgress[phaseNumber] || 0;
      
      // Get features for this phase from codebase analysis
      const phaseFeatures = codebaseAnalysis.features.filter(f => 
        f.phase.startsWith(phaseNumber.toString())
      );
      
      const completedFeatures = phaseFeatures
        .filter(f => f.implemented)
        .map(f => f.name);
        
      const pendingFeatures = phaseFeatures
        .filter(f => !f.implemented)
        .map(f => f.name);

      return {
        phase: phaseNumber,
        name: doc.name,
        completed: phaseProgress >= 80,
        completionPercentage: phaseProgress,
        completedFeatures,
        pendingFeatures,
        validationStatus: this.generateValidationStatus(phaseProgress, completedFeatures, pendingFeatures),
        lastUpdated: new Date().toISOString()
      };
    });
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
        completionPercentage: 15,
        completedFeatures: ['Project structure'],
        pendingFeatures: ['Database setup', 'Authentication', 'RBAC'],
        validationStatus: {
          passed: false,
          errors: [],
          warnings: ['Using fallback data'],
          score: 15
        },
        lastUpdated: new Date().toISOString()
      }
    ];
  }
}

export const implementationStateScanner = new ImplementationStateScannerService();
