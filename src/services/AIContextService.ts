// AI Context Service
// Enhanced AI Context System - Main service for generating AI context

import { AIContextData, ImplementationState } from '@/types/ImplementationState';
import { implementationStateScanner } from './ImplementationStateScanner';
import { versionTracker } from './VersionTracker';
import { aiContextDebugger } from './AIContextDebugger';

class AIContextServiceClass {
  private cache: AIContextData | null = null;
  private cacheTimestamp: Date | null = null;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  async generateAIContext(): Promise<AIContextData> {
    const startTime = Date.now();
    
    try {
      // Check cache validity
      if (this.isCacheValid()) {
        console.log('🔄 Using cached AI context');
        
        // Apply user overrides if debugging
        const cachedData = this.applyUserOverrides(this.cache!);
        
        // Track performance for debugging
        await this.trackPerformance(startTime, true, cachedData);
        
        return cachedData;
      }

      console.log('🔍 Generating fresh AI context...');

      // Get implementation state
      const implementationState = await implementationStateScanner.scanImplementationState();
      
      // Get version information
      const recentChanges = versionTracker.getRecentChanges(24);
      const changeReport = versionTracker.generateChangeReport();

      // Generate context data
      let contextData: AIContextData = {
        implementationState,
        currentCapabilities: this.extractCapabilities(implementationState),
        completedFeatures: this.extractCompletedFeatures(implementationState),
        activeValidations: this.extractActiveValidations(implementationState),
        suggestions: this.generateSuggestions(implementationState, changeReport)
      };

      // Apply user overrides if debugging
      contextData = this.applyUserOverrides(contextData);

      // Update cache
      this.cache = contextData;
      this.cacheTimestamp = new Date();

      // Track context generation for version awareness
      await this.trackContextGeneration(contextData);

      // Track performance for debugging
      await this.trackPerformance(startTime, false, contextData);

      console.log('✅ AI context generated successfully');
      return contextData;
    } catch (error) {
      console.error('❌ Failed to generate AI context:', error);
      return this.getEmptyContext();
    }
  }

  private applyUserOverrides(contextData: AIContextData): AIContextData {
    const overrides = aiContextDebugger.getOverrides();
    if (Object.keys(overrides).length === 0) {
      return contextData;
    }

    console.log('🔧 Applying user overrides to AI context');
    
    let modifiedContext = JSON.parse(JSON.stringify(contextData)); // Deep clone

    Object.entries(overrides).forEach(([key, value]) => {
      if (key.includes('.')) {
        // Handle nested properties
        const keys = key.split('.');
        let target = modifiedContext as any;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!target[keys[i]]) target[keys[i]] = {};
          target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
      } else {
        (modifiedContext as any)[key] = value;
      }
    });

    return modifiedContext;
  }

  private async trackPerformance(startTime: number, cacheHit: boolean, contextData: AIContextData): Promise<void> {
    const duration = Date.now() - startTime;
    const dataSize = JSON.stringify(contextData).length;
    
    // This would be logged to the debugger service
    console.log(`⏱️ Context generation: ${duration}ms, Cache: ${cacheHit ? 'HIT' : 'MISS'}, Size: ${dataSize} bytes`);
  }

  generateContextSummary(): string {
    if (!this.cache) {
      return 'No context data available';
    }

    const { implementationState, completedFeatures, currentCapabilities } = this.cache;
    
    return `Implementation: ${implementationState.overallCompletion}% complete, ` +
           `Phase ${implementationState.currentPhase}, ` +
           `${completedFeatures.length} features completed, ` +
           `${currentCapabilities.length} capabilities available`;
  }

  async invalidateCache(): Promise<void> {
    console.log('🗑️ Invalidating AI context cache');
    this.cache = null;
    this.cacheTimestamp = null;
  }

  private isCacheValid(): boolean {
    if (!this.cache || !this.cacheTimestamp) {
      return false;
    }

    const now = new Date();
    const cacheAge = now.getTime() - this.cacheTimestamp.getTime();
    return cacheAge < this.CACHE_DURATION;
  }

  private extractCapabilities(state: ImplementationState): string[] {
    const capabilities: string[] = [];
    
    state.phases.forEach(phase => {
      phase.completedFeatures.forEach(feature => {
        switch (feature) {
          case 'Authentication System':
            capabilities.push('User authentication', 'Session management', 'JWT tokens');
            break;
          case 'RBAC Foundation':
            capabilities.push('Permission checking', 'Role management', 'Access control');
            break;
          case 'Multi-tenant Foundation':
            capabilities.push('Tenant isolation', 'Context switching', 'Data separation');
            break;
          case 'Database Setup':
            capabilities.push('Database connectivity', 'Query execution', 'Migrations');
            break;
          case 'User Management':
            capabilities.push('User CRUD operations', 'User validation', 'User interface');
            break;
          case 'Advanced RBAC':
            capabilities.push('Permission caching', 'Bulk operations', 'Advanced permissions');
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
        validations.push(`Phase ${phase.phase}: ${phase.validationStatus.warnings.join(', ')}`);
      }
    });

    return validations;
  }

  private generateSuggestions(state: ImplementationState, changeReport: any): string[] {
    const suggestions: string[] = [];
    
    // Add recommendations from implementation state
    suggestions.push(...state.recommendations);
    
    // Add suggestions based on change velocity
    if (changeReport.velocity > 10) {
      suggestions.push('Consider stabilizing recent changes before adding new features');
    }
    
    // Add suggestions based on current phase
    const currentPhase = state.phases.find(p => p.phase === state.currentPhase);
    if (currentPhase && currentPhase.pendingFeatures.length > 0) {
      suggestions.push(`Next: Implement ${currentPhase.pendingFeatures[0]}`);
    }
    
    // Add suggestions based on blockers
    if (state.blockers.length > 0) {
      suggestions.push('Resolve current blockers before proceeding');
    }

    return suggestions;
  }

  private getEmptyContext(): AIContextData {
    return {
      implementationState: {
        phases: [],
        overallCompletion: 0,
        currentPhase: 1,
        blockers: ['Failed to generate context'],
        recommendations: ['Check system configuration'],
        lastScanned: new Date().toISOString()
      },
      currentCapabilities: [],
      completedFeatures: [],
      activeValidations: [],
      suggestions: ['System initialization required']
    };
  }

  private async trackContextGeneration(contextData: AIContextData): Promise<void> {
    try {
      // Track context generation for version awareness
      const changeFeatures = contextData.completedFeatures;
      await versionTracker.trackFileChange(
        'ai-context-generation', 
        JSON.stringify(contextData, null, 2), 
        changeFeatures
      );
    } catch (error) {
      // Non-critical error, don't fail context generation
      console.warn('⚠️ Failed to track context generation:', error);
    }
  }
}

export const aiContextService = new AIContextServiceClass();
