// AI Context Service
// Phase 1.7: AI Context System - Service for generating real AI context data

import { ImplementationState, AIContextData } from '@/types/ImplementationState';
import { implementationStateScanner } from './ImplementationStateScanner';

class AIContextServiceImpl {
  private cache: AIContextData | null = null;
  private lastCacheTime: number = 0;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('🤖 AI Context Service initialized with real document parsing');
  }

  async generateAIContext(): Promise<AIContextData> {
    console.log('🤖 Generating real AI context from actual documentation and codebase analysis...');
    
    const startTime = Date.now();
    
    try {
      // Use real implementation state scanner with actual document parsing
      const implementationState = await implementationStateScanner.scanImplementationState();
      
      console.log('📊 Implementation state received:', implementationState);
      
      // Generate context based on real parsed data
      const context: AIContextData = {
        implementationState,
        completedFeatures: this.extractCompletedFeatures(implementationState),
        currentCapabilities: this.extractCurrentCapabilities(implementationState),
        activeValidations: this.extractActiveValidations(implementationState),
        suggestions: this.generateSuggestions(implementationState)
      };

      console.log('🎯 Generated AI context:', context);

      this.cacheContext(context);
      console.log(`✅ Real AI context generated from actual docs in ${Date.now() - startTime}ms`);
      
      return context;
    } catch (error) {
      console.error('❌ Failed to generate real AI context:', error);
      
      // Return a fallback context instead of throwing
      const fallbackContext: AIContextData = {
        implementationState: {
          phases: [],
          overallCompletion: 0,
          currentPhase: 1,
          blockers: ['Context generation failed'],
          recommendations: ['Check system status'],
          lastScanned: new Date().toISOString()
        },
        completedFeatures: [],
        currentCapabilities: [],
        activeValidations: [],
        suggestions: ['System initialization needed']
      };
      
      return fallbackContext;
    }
  }

  private extractCompletedFeatures(implementationState: ImplementationState): string[] {
    const completed: string[] = [];
    
    implementationState.phases.forEach(phase => {
      if (phase.completed) {
        completed.push(phase.name);
      }
      // Add specific completed features from real analysis
      completed.push(...phase.completedFeatures.slice(0, 3));
    });
    
    return [...new Set(completed)]; // Remove duplicates
  }

  private extractCurrentCapabilities(implementationState: ImplementationState): string[] {
    const capabilities: string[] = [];
    
    implementationState.phases.forEach(phase => {
      // Add capabilities based on real implementation evidence
      phase.completedFeatures.forEach(feature => {
        if (feature.includes('configured') || feature.includes('implemented') || feature.includes('active')) {
          capabilities.push(feature);
        }
      });
    });
    
    // Add system-level capabilities based on real completion
    const completedPhases = implementationState.phases.filter(p => p.completed).length;
    const overallCompletion = implementationState.overallCompletion;
    
    if (completedPhases >= 1 && overallCompletion > 20) {
      capabilities.push('🏗️ Project foundation established');
      capabilities.push('🔐 Authentication system operational');
    }
    
    if (completedPhases >= 2 && overallCompletion > 40) {
      capabilities.push('👥 Role-based access control active');
      capabilities.push('🛡️ Security infrastructure implemented');
    }
    
    if (completedPhases >= 3 && overallCompletion > 60) {
      capabilities.push('🏢 Multi-tenant architecture operational');
      capabilities.push('📊 Progress tracking system active');
    }
    
    if (completedPhases >= 4 && overallCompletion > 80) {
      capabilities.push('🚀 Production-ready system');
      capabilities.push('⭐ Enterprise-grade features complete');
    }
    
    return [...new Set(capabilities)];
  }

  private extractActiveValidations(implementationState: ImplementationState): string[] {
    const validations: string[] = [];
    
    implementationState.phases.forEach(phase => {
      if (phase.validationStatus.warnings.length > 0) {
        validations.push(...phase.validationStatus.warnings);
      }
      if (phase.validationStatus.errors.length > 0) {
        validations.push(...phase.validationStatus.errors);
      }
    });
    
    return validations;
  }

  private generateSuggestions(implementationState: ImplementationState): string[] {
    const suggestions: string[] = [];
    
    // Find incomplete phases and suggest next steps
    const incompletePhases = implementationState.phases.filter(p => !p.completed);
    if (incompletePhases.length > 0) {
      const nextPhase = incompletePhases[0];
      suggestions.push(`🎯 Focus on completing ${nextPhase.name}`);
      
      if (nextPhase.pendingFeatures.length > 0) {
        suggestions.push(`📋 Next task: ${nextPhase.pendingFeatures[0]}`);
      }
    }
    
    // Add recommendations from implementation state
    suggestions.push(...implementationState.recommendations);
    
    // Add validation-based suggestions
    implementationState.phases.forEach(phase => {
      if (phase.validationStatus.warnings.length > 0) {
        suggestions.push(`⚠️ Address warnings in ${phase.name}`);
      }
    });
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  generateContextSummary(): string {
    if (!this.cache) {
      return 'No context data available - run real analysis first';
    }

    const { implementationState, completedFeatures, currentCapabilities } = this.cache;

    return `
      Real Implementation Analysis Summary:
      - Overall Completion: ${implementationState.overallCompletion}% (based on actual requirements)
      - Current Phase: ${implementationState.currentPhase} of 4 phases
      - Completed Features: ${completedFeatures.length} real features detected
      - Current Capabilities: ${currentCapabilities.length} active capabilities
      - Active Blockers: ${implementationState.blockers.length} critical issues
      - Last Scanned: ${implementationState.lastScanned}
    `;
  }

  async invalidateCache(): Promise<void> {
    this.cache = null;
    this.lastCacheTime = 0;
    console.log('🗑️ AI Context cache invalidated');
  }

  private cacheContext(context: AIContextData): void {
    this.cache = context;
    this.lastCacheTime = Date.now();
    console.log('💾 AI Context cached successfully');
  }

  getCachedContext(): AIContextData | null {
    if (this.cache && Date.now() - this.lastCacheTime < this.cacheDuration) {
      console.log('📦 Returning cached AI Context');
      return this.cache;
    }
    return null;
  }
}

export const aiContextService = new AIContextServiceImpl();
