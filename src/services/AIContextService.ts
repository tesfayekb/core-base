
// AI Context Service
// Phase 1.5: AI Context System - Provides context for AI sessions

import { ImplementationState, AIContextData } from '@/types/ImplementationState';
import { implementationStateScanner } from './ImplementationStateScanner';

class AIContextServiceClass {
  private cachedContext: AIContextData | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async generateAIContext(): Promise<AIContextData> {
    try {
      // Check cache first
      if (this.isCacheValid()) {
        console.log('📋 Using cached AI context');
        return this.cachedContext!;
      }

      console.log('🔄 Generating fresh AI context...');
      
      const implementationState = await implementationStateScanner.scanImplementationState();
      
      const contextData: AIContextData = {
        implementationState,
        currentCapabilities: this.extractCurrentCapabilities(implementationState),
        completedFeatures: this.extractCompletedFeatures(implementationState),
        activeValidations: this.extractActiveValidations(implementationState),
        suggestions: this.generateAISuggestions(implementationState)
      };

      // Cache the result
      this.cachedContext = contextData;
      this.lastCacheTime = Date.now();

      console.log('✅ AI context generated:', {
        overallCompletion: `${implementationState.overallCompletion}%`,
        currentPhase: implementationState.currentPhase,
        capabilities: contextData.currentCapabilities.length
      });

      return contextData;
    } catch (error) {
      console.error('❌ AI context generation failed:', error);
      return this.getEmptyContext();
    }
  }

  generateContextSummary(): string {
    if (!this.cachedContext) {
      return 'AI Context: Not initialized. System scanning in progress.';
    }

    const { implementationState } = this.cachedContext;
    
    const summary = [
      `🎯 Current Phase: ${implementationState.currentPhase} (${implementationState.overallCompletion}% complete)`,
      `✅ Completed Features: ${this.cachedContext.completedFeatures.join(', ')}`,
      `🔧 Current Capabilities: ${this.cachedContext.currentCapabilities.join(', ')}`,
      `⚠️ Active Blockers: ${implementationState.blockers.length > 0 ? implementationState.blockers.join(', ') : 'None'}`,
      `💡 Recommendations: ${implementationState.recommendations.join(', ')}`
    ];

    return summary.join('\n');
  }

  async invalidateCache(): Promise<void> {
    console.log('🗑️ Invalidating AI context cache');
    this.cachedContext = null;
    this.lastCacheTime = 0;
  }

  private isCacheValid(): boolean {
    return this.cachedContext !== null && 
           (Date.now() - this.lastCacheTime) < this.CACHE_DURATION;
  }

  private extractCurrentCapabilities(state: ImplementationState): string[] {
    const capabilities: string[] = [];
    
    state.phases.forEach(phase => {
      phase.completedFeatures.forEach(feature => {
        switch (feature) {
          case 'Authentication System':
            capabilities.push('User Authentication', 'Session Management', 'JWT Tokens');
            break;
          case 'RBAC Foundation':
            capabilities.push('Permission Checking', 'Role Management', 'Access Control');
            break;
          case 'Multi-tenant Foundation':
            capabilities.push('Tenant Isolation', 'Context Switching', 'Multi-tenancy');
            break;
          case 'Database Setup':
            capabilities.push('Database Operations', 'Migrations', 'Data Persistence');
            break;
          case 'User Management':
            capabilities.push('User CRUD', 'User Validation', 'User Interface');
            break;
          case 'Advanced RBAC':
            capabilities.push('Permission Caching', 'Bulk Operations', 'Advanced Permissions');
            break;
        }
      });
    });

    return [...new Set(capabilities)]; // Remove duplicates
  }

  private extractCompletedFeatures(state: ImplementationState): string[] {
    const completed: string[] = [];
    
    state.phases.forEach(phase => {
      completed.push(...phase.completedFeatures);
    });

    return completed;
  }

  private extractActiveValidations(state: ImplementationState): string[] {
    const validations: string[] = [];
    
    state.phases.forEach(phase => {
      if (phase.validationStatus.warnings.length > 0) {
        validations.push(...phase.validationStatus.warnings);
      }
    });

    return validations;
  }

  private generateAISuggestions(state: ImplementationState): string[] {
    const suggestions: string[] = [];
    
    // Add phase-specific suggestions
    const currentPhase = state.phases.find(p => p.phase === state.currentPhase);
    if (currentPhase) {
      suggestions.push(`Continue implementing Phase ${currentPhase.phase} features`);
      
      if (currentPhase.pendingFeatures.length > 0) {
        suggestions.push(`Next: ${currentPhase.pendingFeatures[0]}`);
      }
    }

    // Add validation suggestions
    if (state.blockers.length > 0) {
      suggestions.push('Resolve blockers before proceeding to next phase');
    }

    return suggestions;
  }

  private getEmptyContext(): AIContextData {
    return {
      implementationState: {
        phases: [],
        overallCompletion: 0,
        currentPhase: 1,
        blockers: ['Context generation failed'],
        recommendations: ['Check system status'],
        lastScanned: new Date().toISOString()
      },
      currentCapabilities: [],
      completedFeatures: [],
      activeValidations: [],
      suggestions: ['Initialize AI context system']
    };
  }
}

export const aiContextService = new AIContextServiceClass();
