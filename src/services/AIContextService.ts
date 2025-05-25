// AI Context Service - Enhanced
// Phase 1.5: AI Context System - Enhanced with better caching and memory management

import { ImplementationState, AIContextData } from '@/types/ImplementationState';
import { implementationStateScanner } from './ImplementationStateScanner';

class AIContextServiceClass {
  private cachedContext: AIContextData | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // Increased to 15 minutes for large codebases
  private readonly MEMORY_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start memory cleanup timer
    this.startMemoryCleanupTimer();
  }

  async generateAIContext(): Promise<AIContextData> {
    try {
      // Check cache first with enhanced validation
      if (this.isCacheValid()) {
        console.log('📋 Using cached AI context');
        return this.cachedContext!;
      }

      console.log('🔄 Generating fresh AI context with enhanced scanning...');
      
      const implementationState = await implementationStateScanner.scanImplementationState();
      
      const contextData: AIContextData = {
        implementationState,
        currentCapabilities: this.extractCurrentCapabilities(implementationState),
        completedFeatures: this.extractCompletedFeatures(implementationState),
        activeValidations: this.extractActiveValidations(implementationState),
        suggestions: this.generateAISuggestions(implementationState)
      };

      // Cache the result with memory management
      this.updateCache(contextData);

      console.log('✅ Enhanced AI context generated:', {
        overallCompletion: `${implementationState.overallCompletion}%`,
        currentPhase: implementationState.currentPhase,
        capabilities: contextData.currentCapabilities.length,
        cacheInfo: implementationStateScanner.getCacheInformation()
      });

      return contextData;
    } catch (error) {
      console.error('❌ AI context generation failed:', error);
      return this.getEmptyContext();
    }
  }

  generateContextSummary(): string {
    if (!this.cachedContext) {
      return 'AI Context: Not initialized. Enhanced system scanning in progress.';
    }

    const { implementationState } = this.cachedContext;
    
    const summary = [
      `🎯 Current Phase: ${implementationState.currentPhase} (${implementationState.overallCompletion}% complete)`,
      `✅ Completed Features: ${this.cachedContext.completedFeatures.join(', ')}`,
      `🔧 Current Capabilities: ${this.cachedContext.currentCapabilities.join(', ')}`,
      `⚠️ Active Blockers: ${implementationState.blockers.length > 0 ? implementationState.blockers.join(', ') : 'None'}`,
      `💡 Recommendations: ${implementationState.recommendations.join(', ')}`,
      `🧠 Cache Status: ${this.getCacheStatus()}`
    ];

    return summary.join('\n');
  }

  async invalidateCache(): Promise<void> {
    console.log('🗑️ Invalidating AI context cache and performing cleanup');
    this.cachedContext = null;
    this.lastCacheTime = 0;
    
    // Also clear file system cache for complete refresh
    const { fileSystemScanner } = await import('./FileSystemScanner');
    fileSystemScanner.clearCache();
  }

  getCacheStatus(): string {
    const age = Date.now() - this.lastCacheTime;
    const ageMinutes = Math.floor(age / (60 * 1000));
    return `${ageMinutes}m old, ${this.isCacheValid() ? 'valid' : 'stale'}`;
  }

  getMemoryUsage(): { contextSize: number; estimatedMemory: string } {
    const contextSize = this.cachedContext ? JSON.stringify(this.cachedContext).length : 0;
    const estimatedMemory = `${Math.round(contextSize / 1024)}KB`;
    return { contextSize, estimatedMemory };
  }

  private isCacheValid(): boolean {
    return this.cachedContext !== null && 
           (Date.now() - this.lastCacheTime) < this.CACHE_DURATION;
  }

  private updateCache(contextData: AIContextData): void {
    this.cachedContext = contextData;
    this.lastCacheTime = Date.now();
    
    // Log memory usage
    const memUsage = this.getMemoryUsage();
    console.log(`📊 Context cached: ${memUsage.estimatedMemory}`);
  }

  private startMemoryCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.MEMORY_CLEANUP_INTERVAL);
  }

  private performMemoryCleanup(): void {
    const memUsage = this.getMemoryUsage();
    console.log(`🧹 Memory cleanup check: ${memUsage.estimatedMemory}`);
    
    // If cache is stale and large, clear it
    if (!this.isCacheValid() && memUsage.contextSize > 100 * 1024) { // 100KB threshold
      console.log('🗑️ Clearing stale context cache for memory optimization');
      this.cachedContext = null;
      this.lastCacheTime = 0;
    }
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

    return [...new Set(capabilities)];
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
    
    const currentPhase = state.phases.find(p => p.phase === state.currentPhase);
    if (currentPhase) {
      suggestions.push(`Continue implementing Phase ${currentPhase.phase} features`);
      
      if (currentPhase.pendingFeatures.length > 0) {
        suggestions.push(`Next: ${currentPhase.pendingFeatures[0]}`);
      }
    }

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
        blockers: ['Enhanced context generation failed'],
        recommendations: ['Check enhanced system status'],
        lastScanned: new Date().toISOString()
      },
      currentCapabilities: [],
      completedFeatures: [],
      activeValidations: [],
      suggestions: ['Initialize enhanced AI context system']
    };
  }

  // Cleanup method for proper resource management
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cachedContext = null;
  }
}

export const aiContextService = new AIContextServiceClass();
