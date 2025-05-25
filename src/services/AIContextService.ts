// AI Context Service - Enhanced with AST parsing and version tracking
// Phase 1.5: AI Context System - Enhanced intelligence and accuracy

import { ImplementationState, AIContextData } from '@/types/ImplementationState';
import { implementationStateScanner } from './ImplementationStateScanner';
import { versionTracker } from './VersionTracker';

class AIContextServiceClass {
  private cachedContext: AIContextData | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 20 * 60 * 1000; // Increased to 20 minutes for enhanced analysis
  private readonly MEMORY_CLEANUP_INTERVAL = 45 * 60 * 1000; // 45 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startMemoryCleanupTimer();
  }

  async generateAIContext(): Promise<AIContextData> {
    try {
      // Check cache first with enhanced validation
      if (this.isCacheValid()) {
        console.log('📋 Using cached enhanced AI context');
        return this.cachedContext!;
      }

      console.log('🔄 Generating enhanced AI context with AST analysis and version tracking...');
      
      const implementationState = await implementationStateScanner.scanImplementationState();
      
      // Generate enhanced context with version awareness
      const contextData: AIContextData = {
        implementationState,
        currentCapabilities: this.extractEnhancedCapabilities(implementationState),
        completedFeatures: this.extractCompletedFeatures(implementationState),
        activeValidations: this.extractActiveValidations(implementationState),
        suggestions: await this.generateEnhancedSuggestions(implementationState)
      };

      // Create system snapshot for version tracking
      if (versionTracker) {
        const phaseProgress: Record<number, number> = {};
        const featureStatus: Record<string, 'completed' | 'in-progress' | 'pending'> = {};
        
        implementationState.phases.forEach(phase => {
          phaseProgress[phase.phase] = phase.completionPercentage;
          phase.completedFeatures.forEach(feature => {
            featureStatus[feature] = 'completed';
          });
          phase.pendingFeatures.forEach(feature => {
            featureStatus[feature] = 'pending';
          });
        });

        versionTracker.createSystemSnapshot(
          implementationState.overallCompletion,
          phaseProgress,
          featureStatus
        );
      }

      // Cache the result with enhanced memory management
      this.updateCache(contextData);

      console.log('✅ Enhanced AI context generated with intelligence features:', {
        overallCompletion: `${implementationState.overallCompletion}%`,
        currentPhase: implementationState.currentPhase,
        capabilities: contextData.currentCapabilities.length,
        suggestions: contextData.suggestions.length,
        cacheInfo: implementationStateScanner.getCacheInformation(),
        versionAwareness: versionTracker ? 'enabled' : 'disabled'
      });

      return contextData;
    } catch (error) {
      console.error('❌ Enhanced AI context generation failed:', error);
      return this.getEmptyContext();
    }
  }

  generateContextSummary(): string {
    if (!this.cachedContext) {
      return 'Enhanced AI Context: Not initialized. Advanced system scanning with AST analysis in progress.';
    }

    const { implementationState } = this.cachedContext;
    
    // Get version tracking insights
    const changeReport = versionTracker ? versionTracker.generateChangeReport() : null;
    
    const summary = [
      `🎯 Current Phase: ${implementationState.currentPhase} (${implementationState.overallCompletion}% complete)`,
      `✅ Completed Features: ${this.cachedContext.completedFeatures.slice(0, 3).join(', ')}${this.cachedContext.completedFeatures.length > 3 ? '...' : ''}`,
      `🔧 Current Capabilities: ${this.cachedContext.currentCapabilities.slice(0, 4).join(', ')}${this.cachedContext.currentCapabilities.length > 4 ? '...' : ''}`,
      `⚠️ Active Blockers: ${implementationState.blockers.length > 0 ? implementationState.blockers.slice(0, 2).join(', ') : 'None'}`,
      `💡 AI Recommendations: ${implementationState.recommendations.slice(0, 2).join(', ')}`,
      `🧠 Cache Status: ${this.getCacheStatus()}`,
      changeReport ? `📈 Change Velocity: ${changeReport.velocity.toFixed(1)}/hour, ${changeReport.recentChanges.length} recent changes` : '',
      changeReport && changeReport.regressions.length > 0 ? `⚠️ Potential Issues: ${changeReport.regressions.length} detected` : ''
    ].filter(Boolean);

    return summary.join('\n');
  }

  async getVersionInsights(): Promise<{
    recentChanges: any[];
    progressTrend: any[];
    regressions: any[];
    velocity: number;
    recommendations: string[];
  }> {
    if (!versionTracker) {
      return {
        recentChanges: [],
        progressTrend: [],
        regressions: [],
        velocity: 0,
        recommendations: ['Version tracking not available']
      };
    }

    const changeReport = versionTracker.generateChangeReport();
    const progressTrend = versionTracker.getProgressTrend(7);

    return {
      recentChanges: changeReport.recentChanges,
      progressTrend,
      regressions: changeReport.regressions,
      velocity: changeReport.velocity,
      recommendations: changeReport.recommendations
    };
  }

  async invalidateCache(): Promise<void> {
    console.log('🗑️ Invalidating enhanced AI context cache and performing cleanup');
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

  getMemoryUsage(): { contextSize: number; estimatedMemory: string; details: any } {
    const contextSize = this.cachedContext ? JSON.stringify(this.cachedContext).length : 0;
    const estimatedMemory = `${Math.round(contextSize / 1024)}KB`;
    
    // Get detailed memory breakdown
    const details = {
      context: `${Math.round(contextSize / 1024)}KB`,
      fileSystemCache: '0KB', // Will be updated by scanner
      versionHistory: '0KB' // Estimated version tracking memory
    };

    return { contextSize, estimatedMemory, details };
  }

  private isCacheValid(): boolean {
    return this.cachedContext !== null && 
           (Date.now() - this.lastCacheTime) < this.CACHE_DURATION;
  }

  private updateCache(contextData: AIContextData): void {
    this.cachedContext = contextData;
    this.lastCacheTime = Date.now();
    
    // Log enhanced memory usage
    const memUsage = this.getMemoryUsage();
    console.log(`📊 Enhanced context cached:`, {
      size: memUsage.estimatedMemory,
      features: contextData.completedFeatures.length,
      capabilities: contextData.currentCapabilities.length,
      suggestions: contextData.suggestions.length
    });
  }

  private startMemoryCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.MEMORY_CLEANUP_INTERVAL);
  }

  private performMemoryCleanup(): void {
    const memUsage = this.getMemoryUsage();
    console.log(`🧹 Enhanced memory cleanup check:`, memUsage.details);
    
    // If cache is stale and large, clear it
    if (!this.isCacheValid() && memUsage.contextSize > 200 * 1024) { // 200KB threshold
      console.log('🗑️ Clearing stale enhanced context cache for memory optimization');
      this.cachedContext = null;
      this.lastCacheTime = 0;
    }
  }

  private extractEnhancedCapabilities(state: ImplementationState): string[] {
    const capabilities: string[] = [];
    
    state.phases.forEach(phase => {
      phase.completedFeatures.forEach(feature => {
        switch (feature) {
          case 'Authentication System':
            capabilities.push('User Authentication', 'Session Management', 'JWT Tokens', 'Multi-factor Auth');
            break;
          case 'RBAC Foundation':
            capabilities.push('Permission Checking', 'Role Management', 'Access Control', 'Permission Caching');
            break;
          case 'Multi-tenant Foundation':
            capabilities.push('Tenant Isolation', 'Context Switching', 'Multi-tenancy', 'Tenant Security');
            break;
          case 'Database Setup':
            capabilities.push('Database Operations', 'Migrations', 'Data Persistence', 'Query Optimization');
            break;
          case 'User Management':
            capabilities.push('User CRUD', 'User Validation', 'User Interface', 'Bulk Operations');
            break;
          case 'Advanced RBAC':
            capabilities.push('Permission Caching', 'Bulk Operations', 'Advanced Permissions', 'Dependency Resolution');
            break;
          case 'Service Layer':
            capabilities.push('Business Logic', 'Data Services', 'Integration Layer');
            break;
        }
      });
    });

    return [...new Set(capabilities)];
  }

  private async generateEnhancedSuggestions(state: ImplementationState): Promise<string[]> {
    const suggestions: string[] = [];
    
    const currentPhase = state.phases.find(p => p.phase === state.currentPhase);
    if (currentPhase) {
      suggestions.push(`Continue implementing Phase ${currentPhase.phase}: ${currentPhase.name}`);
      
      if (currentPhase.pendingFeatures.length > 0) {
        suggestions.push(`Next priority: ${currentPhase.pendingFeatures[0]}`);
      }

      // Phase-specific suggestions
      if (currentPhase.phase === 1 && currentPhase.completionPercentage < 50) {
        suggestions.push('Focus on authentication and RBAC foundation before advancing');
      } else if (currentPhase.phase === 2 && currentPhase.completionPercentage > 75) {
        suggestions.push('Consider moving to Phase 3 for advanced features');
      }
    }

    // Version-aware suggestions
    if (versionTracker) {
      const changeReport = versionTracker.generateChangeReport();
      suggestions.push(...changeReport.recommendations);

      // Suggest stability focus if high change velocity
      if (changeReport.velocity > 15) {
        suggestions.push('High change velocity detected - consider stabilization period');
      }

      // Suggest testing if many recent changes
      if (changeReport.recentChanges.filter(c => c.impact === 'high').length > 2) {
        suggestions.push('Multiple high-impact changes - run comprehensive testing');
      }
    }

    if (state.blockers.length > 0) {
      suggestions.push(`Resolve ${state.blockers.length} blocker(s) before proceeding`);
    }

    return suggestions;
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

  private getEmptyContext(): AIContextData {
    return {
      implementationState: {
        phases: [],
        overallCompletion: 0,
        currentPhase: 1,
        blockers: ['Enhanced context generation with AST analysis failed'],
        recommendations: ['Check enhanced system status and AST parser'],
        lastScanned: new Date().toISOString()
      },
      currentCapabilities: [],
      completedFeatures: [],
      activeValidations: [],
      suggestions: ['Initialize enhanced AI context system with AST support']
    };
  }

  // Cleanup method for proper resource management
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cachedContext = null;
    
    // Clear version tracking if needed
    if (versionTracker) {
      versionTracker.clearHistory();
    }
  }
}

export const aiContextService = new AIContextServiceClass();
