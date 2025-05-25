
// AI Context Service
// Phase 1.5: AI Context System - Service for generating AI context data

import { ImplementationState, AIContextData } from '@/types/ImplementationState';
import { implementationStateScanner } from './ImplementationStateScanner';

class AIContextServiceImpl {
  private cache: AIContextData | null = null;
  private lastCacheTime: number = 0;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('🤖 AI Context Service initialized');
  }

  async generateAIContext(): Promise<AIContextData> {
    console.log('🤖 Generating real AI context from documentation and codebase...');
    
    const startTime = Date.now();
    
    try {
      // Use real implementation state scanner
      const implementationState = await implementationStateScanner.scanImplementationState();
      
      // Generate context based on real data
      const context: AIContextData = {
        implementationState,
        completedFeatures: this.extractCompletedFeatures(implementationState),
        currentCapabilities: this.extractCurrentCapabilities(implementationState),
        activeValidations: this.extractActiveValidations(implementationState),
        suggestions: this.generateSuggestions(implementationState)
      };

      this.cacheContext(context);
      console.log(`✅ Real AI context generated in ${Date.now() - startTime}ms`);
      
      return context;
    } catch (error) {
      console.error('❌ Failed to generate real AI context:', error);
      throw error;
    }
  }

  private extractCompletedFeatures(implementationState: ImplementationState): string[] {
    const completed: string[] = [];
    
    implementationState.phases.forEach(phase => {
      if (phase.completed) {
        completed.push(phase.name);
        completed.push(...phase.completedFeatures.slice(0, 2)); // Add top completed features
      }
    });
    
    return [...new Set(completed)]; // Remove duplicates
  }

  private extractCurrentCapabilities(implementationState: ImplementationState): string[] {
    const capabilities: string[] = [];
    
    implementationState.phases.forEach(phase => {
      phase.completedFeatures.forEach(feature => {
        if (feature.includes('implementation') || feature.includes('configured') || feature.includes('detected')) {
          capabilities.push(feature);
        }
      });
    });
    
    // Add system-level capabilities
    const completedPhases = implementationState.phases.filter(p => p.completed).length;
    if (completedPhases >= 3) {
      capabilities.push('Multi-tenant architecture');
      capabilities.push('Role-based access control');
      capabilities.push('Security monitoring');
    }
    
    if (completedPhases >= 5) {
      capabilities.push('Real-time implementation tracking');
      capabilities.push('Advanced security features');
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
      suggestions.push(`Focus on completing ${nextPhase.name}`);
      
      if (nextPhase.pendingFeatures.length > 0) {
        suggestions.push(`Next task: ${nextPhase.pendingFeatures[0]}`);
      }
    }
    
    // Add recommendations from implementation state
    suggestions.push(...implementationState.recommendations);
    
    // Add validation-based suggestions
    implementationState.phases.forEach(phase => {
      if (phase.validationStatus.warnings.length > 0) {
        suggestions.push(`Address warnings in ${phase.name}`);
      }
    });
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  generateContextSummary(): string {
    if (!this.cache) {
      return 'No context data available';
    }

    const { implementationState, completedFeatures, currentCapabilities } = this.cache;

    return `
      System Summary:
      - Overall Completion: ${implementationState.overallCompletion}%
      - Current Phase: ${implementationState.currentPhase}
      - Completed Features: ${completedFeatures.length}
      - Current Capabilities: ${currentCapabilities.length}
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
