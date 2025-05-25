
// Implementation State Scanner
// Real implementation scanner using document parsing and codebase analysis

import { ImplementationState, PhaseState, ValidationStatus } from '@/types/ImplementationState';
import { documentParser } from './DocumentParser';
import { codebaseAnalyzer } from './CodebaseAnalyzer';

class ImplementationStateScannerService {
  async scanImplementationState(): Promise<ImplementationState> {
    console.log('🔍 Scanning real implementation state...');
    
    try {
      // Parse documentation to get phase structure
      const phaseDocuments = await documentParser.parseImplementationDocs();
      
      // Analyze codebase to detect implemented features
      const codebaseAnalysis = await codebaseAnalyzer.analyzeCodebase();
      
      // Generate phase states based on real data
      const phases = this.generateRealPhaseAnalysis(phaseDocuments, codebaseAnalysis);
      const overall = this.calculateOverallProgress(phases);
      
      return {
        phases,
        overallCompletion: overall.completion,
        currentPhase: overall.currentPhase,
        blockers: overall.blockers,
        recommendations: this.generateRealRecommendations(phases, codebaseAnalysis),
        lastScanned: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Implementation scan failed:', error);
      return this.getEmptyState();
    }
  }

  private generateRealPhaseAnalysis(phaseDocuments: any[], codebaseAnalysis: any): PhaseState[] {
    const now = new Date().toISOString();
    const analysisFeatures = codebaseAnalysis.features;
    
    return phaseDocuments.map((doc, index) => {
      // Find corresponding feature in codebase analysis
      const feature = analysisFeatures.find((f: any) => 
        f.name.toLowerCase().includes(doc.name.toLowerCase()) ||
        doc.name.toLowerCase().includes(f.name.toLowerCase())
      );
      
      const completionPercentage = feature ? feature.confidence : 0;
      const isCompleted = completionPercentage >= 75;
      
      const completedFeatures = isCompleted ? [doc.name] : [];
      const pendingFeatures = isCompleted ? [] : [doc.name];
      
      // Add task details
      if (feature && feature.evidence) {
        if (isCompleted) {
          completedFeatures.push(...feature.evidence.slice(0, 3));
        } else {
          pendingFeatures.push(...doc.tasks.slice(0, 2).map((t: any) => t.name));
        }
      }
      
      const validationStatus: ValidationStatus = {
        passed: isCompleted,
        warnings: completionPercentage > 50 && completionPercentage < 75 ? 
          [`${doc.name} partially implemented (${completionPercentage}%)`] : [],
        errors: completionPercentage < 25 ? 
          [`${doc.name} not started`] : [],
        score: completionPercentage
      };
      
      return {
        phase: index + 1,
        name: `Phase 1.${index + 1}: ${doc.name}`,
        completed: isCompleted,
        completionPercentage,
        completedFeatures,
        pendingFeatures,
        validationStatus,
        lastUpdated: now
      };
    });
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
      
      if (phase.completed && currentPhase === index + 1) {
        currentPhase = index + 2;
      }
      
      if (phase.validationStatus.errors.length > 0) {
        blockers.push(...phase.validationStatus.errors);
      }
    });

    const completion = Math.round(totalCompletion / phases.length);

    return { 
      completion, 
      currentPhase: Math.min(currentPhase, phases.length), 
      blockers 
    };
  }

  private generateRealRecommendations(phases: PhaseState[], codebaseAnalysis: any): string[] {
    const recommendations: string[] = [];

    // Find the first incomplete phase
    const incompletePhase = phases.find(p => !p.completed);
    if (incompletePhase) {
      recommendations.push(`Focus on completing ${incompletePhase.name}`);
      
      if (incompletePhase.pendingFeatures.length > 0) {
        recommendations.push(`Next task: ${incompletePhase.pendingFeatures[0]}`);
      }
    }

    // Add recommendations based on codebase analysis
    const lowConfidenceFeatures = codebaseAnalysis.features.filter((f: any) => 
      f.confidence < 50 && f.confidence > 0
    );
    
    if (lowConfidenceFeatures.length > 0) {
      recommendations.push(`Improve implementation of: ${lowConfidenceFeatures[0].name}`);
    }

    // Add phase-specific recommendations
    const completedPhases = phases.filter(p => p.completed).length;
    if (completedPhases < 3) {
      recommendations.push('Focus on completing foundation phases before advanced features');
    }

    // Add general recommendations
    recommendations.push('Follow the authoritative implementation path in src/docs/ai-development/');
    recommendations.push('Validate each phase before proceeding to the next');

    return recommendations;
  }

  private getEmptyState(): ImplementationState {
    return {
      phases: [],
      overallCompletion: 0,
      currentPhase: 1,
      blockers: ['Real-time scanning failed'],
      recommendations: ['Check documentation parsing and codebase analysis'],
      lastScanned: new Date().toISOString()
    };
  }
}

export const implementationStateScanner = new ImplementationStateScannerService();
