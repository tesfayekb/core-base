
// Implementation State Scanner
// Real implementation scanner using actual document parsing and codebase analysis

import { ImplementationState, PhaseState, ValidationStatus } from '@/types/ImplementationState';
import { realDocumentParser } from './RealDocumentParser';
import { realCodebaseAnalyzer } from './RealCodebaseAnalyzer';

class ImplementationStateScannerService {
  async scanImplementationState(): Promise<ImplementationState> {
    console.log('🔍 Scanning real implementation state with actual document parsing...');
    
    try {
      // Parse real documentation to get phase structure
      const phaseDocuments = await realDocumentParser.parseImplementationDocs();
      
      // Analyze real codebase to detect implemented features
      const codebaseAnalysis = await realCodebaseAnalyzer.analyzeCodebase();
      
      // Generate phase states based on real data comparison
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
      console.error('❌ Real implementation scan failed:', error);
      return this.getEmptyState();
    }
  }

  private generateRealPhaseAnalysis(phaseDocuments: any[], codebaseAnalysis: any): PhaseState[] {
    const now = new Date().toISOString();
    
    return phaseDocuments.map((doc, index) => {
      // Find corresponding feature in real codebase analysis
      const feature = codebaseAnalysis.features.find((f: any) => 
        f.name.toLowerCase().includes(doc.name.toLowerCase()) ||
        doc.name.toLowerCase().includes(f.name.toLowerCase())
      );
      
      const completionPercentage = feature ? feature.confidence : 0;
      const isCompleted = completionPercentage >= 80; // Higher threshold for "completed"
      
      // Use real data from documents and codebase
      const completedFeatures = feature ? feature.requirementsMet : [];
      const pendingFeatures = feature ? feature.requirementsPending : doc.tasks;
      
      // Real validation based on actual requirements
      const validationStatus: ValidationStatus = this.generateRealValidationStatus(
        doc, feature, completionPercentage
      );
      
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

  private generateRealValidationStatus(doc: any, feature: any, completion: number): ValidationStatus {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (!feature) {
      errors.push(`${doc.name} implementation not detected in codebase`);
      return {
        passed: false,
        warnings,
        errors,
        score: 0
      };
    }
    
    // Generate warnings for partially implemented features
    if (completion > 30 && completion < 80) {
      warnings.push(`${doc.name} partially implemented (${completion}%)`);
      
      if (feature.requirementsPending.length > 0) {
        warnings.push(`Missing: ${feature.requirementsPending.slice(0, 2).join(', ')}`);
      }
    }
    
    // Generate errors for critical missing requirements
    if (completion < 30) {
      errors.push(`${doc.name} implementation insufficient (${completion}%)`);
      
      if (feature.requirementsPending.length > 0) {
        errors.push(`Critical missing: ${feature.requirementsPending[0]}`);
      }
    }
    
    // Success criteria validation
    if (completion >= 80 && doc.successCriteria) {
      const unmetCriteria = doc.successCriteria.filter((criteria: string) => 
        !feature.evidence.some((evidence: string) => 
          evidence.toLowerCase().includes(criteria.toLowerCase().split(' ')[0])
        )
      );
      
      if (unmetCriteria.length > 0) {
        warnings.push(`Success criteria not verified: ${unmetCriteria[0]}`);
      }
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
      blockers: [...new Set(blockers)] // Remove duplicates
    };
  }

  private generateRealRecommendations(phases: PhaseState[], codebaseAnalysis: any): string[] {
    const recommendations: string[] = [];

    // Find the first incomplete phase and provide specific guidance
    const incompletePhase = phases.find(p => !p.completed);
    if (incompletePhase) {
      recommendations.push(`🎯 Focus on completing ${incompletePhase.name}`);
      
      if (incompletePhase.pendingFeatures.length > 0) {
        recommendations.push(`📋 Next task: ${incompletePhase.pendingFeatures[0]}`);
      }
      
      // Add specific recommendations based on validation status
      if (incompletePhase.validationStatus.errors.length > 0) {
        recommendations.push(`🚨 Critical: ${incompletePhase.validationStatus.errors[0]}`);
      }
    }

    // Add recommendations based on real codebase analysis
    const lowConfidenceFeatures = codebaseAnalysis.features.filter((f: any) => 
      f.confidence < 50 && f.confidence > 0
    );
    
    if (lowConfidenceFeatures.length > 0) {
      recommendations.push(`⚠️ Improve implementation quality: ${lowConfidenceFeatures[0].name}`);
    }

    // Phase-specific recommendations based on real progress
    const completedPhases = phases.filter(p => p.completed).length;
    if (completedPhases < 2) {
      recommendations.push('🏗️ Complete foundation phases before proceeding to advanced features');
    }
    
    if (completedPhases >= 4) {
      recommendations.push('🚀 Foundation strong - ready for Phase 2 core features');
    }

    // Add real implementation path guidance
    recommendations.push('📚 Follow Phase 1 implementation guides in src/docs/implementation/phase1/');
    recommendations.push('✅ Validate each phase before proceeding to maintain quality');

    return recommendations;
  }

  private getEmptyState(): ImplementationState {
    return {
      phases: [],
      overallCompletion: 0,
      currentPhase: 1,
      blockers: ['Real-time scanning failed - check document parsing and codebase analysis'],
      recommendations: [
        'Verify implementation documentation exists in src/docs/',
        'Check codebase analyzer can access project files',
        'Review console for specific parsing errors'
      ],
      lastScanned: new Date().toISOString()
    };
  }
}

export const implementationStateScanner = new ImplementationStateScannerService();
