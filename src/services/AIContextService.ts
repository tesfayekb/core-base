
// AI Context Service
// Phase 1.7: AI Context System - Enhanced with real codebase scanning

import { ImplementationState, AIContextData } from '@/types/ImplementationState';
import { enhancedImplementationStateScanner } from './EnhancedImplementationStateScanner';

class AIContextServiceImpl {
  private cache: AIContextData | null = null;
  private lastCacheTime: number = 0;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('🤖 AI Context Service initialized with enhanced scanning capability');
  }

  async generateAIContext(forceRescan: boolean = false): Promise<AIContextData> {
    console.log('🤖 Generating AI context with enhanced scanning...', { forceRescan });
    
    const startTime = Date.now();
    
    try {
      // Use enhanced implementation state scanner with real codebase analysis
      console.log('📊 Starting enhanced implementation state scan...');
      const implementationState = await enhancedImplementationStateScanner.scanImplementationState(forceRescan);
      
      console.log('📊 Enhanced implementation state received:', {
        phasesCount: implementationState.phases?.length || 0,
        overallCompletion: implementationState.overallCompletion,
        currentPhase: implementationState.currentPhase,
        blockersCount: implementationState.blockers?.length || 0,
        dataSource: forceRescan ? 'fresh_scan' : 'database'
      });
      
      // Generate context based on real scanned data
      const context: AIContextData = {
        implementationState,
        completedFeatures: this.extractCompletedFeatures(implementationState),
        currentCapabilities: this.extractCurrentCapabilities(implementationState),
        activeValidations: this.extractActiveValidations(implementationState),
        suggestions: this.generateSuggestions(implementationState)
      };

      console.log('🎯 Generated enhanced AI context:', {
        hasImplementationState: !!context.implementationState,
        completedFeaturesCount: context.completedFeatures.length,
        capabilitiesCount: context.currentCapabilities.length,
        suggestionsCount: context.suggestions.length,
        scanDuration: Date.now() - startTime
      });

      this.cacheContext(context);
      console.log(`✅ Enhanced AI context generated in ${Date.now() - startTime}ms`);
      
      return context;
    } catch (error) {
      console.error('❌ Failed to generate enhanced AI context:', error);
      
      // Return a fallback context
      const fallbackContext: AIContextData = {
        implementationState: {
          phases: this.generateFallbackPhases(),
          overallCompletion: 25,
          currentPhase: 1,
          blockers: ['Enhanced scanning failed - using fallback data'],
          recommendations: ['Try force rescan', 'Check enhanced scanner service'],
          lastScanned: new Date().toISOString()
        },
        completedFeatures: ['Project setup', 'Basic configuration'],
        currentCapabilities: ['🏗️ Project foundation', '⚙️ Basic configuration'],
        activeValidations: [],
        suggestions: ['Enhanced scanner needs investigation', 'Check implementation state scanner']
      };
      
      console.log('🔄 Using enhanced fallback context data');
      return fallbackContext;
    }
  }

  private generateFallbackPhases() {
    return [
      {
        phase: 1,
        name: 'Foundation',
        completed: false,
        completionPercentage: 25,
        completedFeatures: ['Project setup', 'Basic configuration'],
        pendingFeatures: ['Database setup', 'Authentication', 'RBAC foundation'],
        validationStatus: {
          passed: false,
          errors: [],
          warnings: ['Using fallback data'],
          score: 25
        },
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  private extractCompletedFeatures(implementationState: ImplementationState): string[] {
    const completed: string[] = [];
    
    implementationState.phases.forEach(phase => {
      if (phase.completed) {
        completed.push(phase.name);
      }
      completed.push(...phase.completedFeatures.slice(0, 3));
    });
    
    return [...new Set(completed)];
  }

  private extractCurrentCapabilities(implementationState: ImplementationState): string[] {
    const capabilities: string[] = [];
    
    implementationState.phases.forEach(phase => {
      phase.completedFeatures.forEach(feature => {
        if (feature.includes('configured') || feature.includes('implemented') || feature.includes('active')) {
          capabilities.push(feature);
        }
      });
    });
    
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
    
    const incompletePhases = implementationState.phases.filter(p => !p.completed);
    if (incompletePhases.length > 0) {
      const nextPhase = incompletePhases[0];
      suggestions.push(`🎯 Focus on completing ${nextPhase.name}`);
      
      if (nextPhase.pendingFeatures.length > 0) {
        suggestions.push(`📋 Next task: ${nextPhase.pendingFeatures[0]}`);
      }
    }
    
    suggestions.push(...implementationState.recommendations);
    
    implementationState.phases.forEach(phase => {
      if (phase.validationStatus.warnings.length > 0) {
        suggestions.push(`⚠️ Address warnings in ${phase.name}`);
      }
    });
    
    return [...new Set(suggestions)];
  }

  generateContextSummary(): string {
    if (!this.cache) {
      return 'No context data available - run enhanced analysis first';
    }

    const { implementationState, completedFeatures, currentCapabilities } = this.cache;

    return `
      Enhanced Implementation Analysis Summary:
      - Overall Completion: ${implementationState.overallCompletion}% (real codebase analysis)
      - Current Phase: ${implementationState.currentPhase} of 4 phases
      - Completed Features: ${completedFeatures.length} features detected via scanning
      - Current Capabilities: ${currentCapabilities.length} active capabilities
      - Active Blockers: ${implementationState.blockers.length} critical issues
      - Last Scanned: ${implementationState.lastScanned}
      - Data Source: Enhanced database integration with codebase scanning
    `;
  }

  async invalidateCache(): Promise<void> {
    this.cache = null;
    this.lastCacheTime = 0;
    console.log('🗑️ Enhanced AI Context cache invalidated');
  }

  private cacheContext(context: AIContextData): void {
    this.cache = context;
    this.lastCacheTime = Date.now();
    console.log('💾 Enhanced AI Context cached successfully');
  }

  getCachedContext(): AIContextData | null {
    if (this.cache && Date.now() - this.lastCacheTime < this.cacheDuration) {
      console.log('📦 Returning cached Enhanced AI Context');
      return this.cache;
    }
    return null;
  }

  private generateFallbackPhases() {
    return [
      {
        phase: 1,
        name: 'Foundation',
        completed: false,
        completionPercentage: 25,
        completedFeatures: ['Project setup', 'Basic configuration'],
        pendingFeatures: ['Database setup', 'Authentication', 'RBAC foundation'],
        validationStatus: {
          passed: false,
          errors: [],
          warnings: ['Using enhanced fallback data'],
          score: 25
        },
        lastUpdated: new Date().toISOString()
      }
    ];
  }
}

export const aiContextService = new AIContextServiceImpl();
