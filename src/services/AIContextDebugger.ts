// AI Context Debugger Service
// Developer tools for debugging and visualizing AI context

import { AIContextData, ImplementationState } from '@/types/ImplementationState';
import { aiContextService } from './AIContextService';

export interface DebugSession {
  id: string;
  timestamp: Date;
  contextData: AIContextData;
  performance: {
    generationTime: number;
    cacheHit: boolean;
    dataSize: number;
  };
  userOverrides: Record<string, any>;
}

export interface ContextVisualization {
  phases: {
    phase: number;
    completion: number;
    features: string[];
    blockers: string[];
  }[];
  capabilities: {
    category: string;
    items: string[];
  }[];
  suggestions: {
    priority: 'high' | 'medium' | 'low';
    text: string;
    category: string;
  }[];
}

class AIContextDebuggerService {
  private debugSessions: DebugSession[] = [];
  private userOverrides: Record<string, any> = {};
  private isDebugging = false;

  startDebugging(): void {
    this.isDebugging = true;
    console.log('🔍 AI Context debugging enabled');
  }

  stopDebugging(): void {
    this.isDebugging = false;
    console.log('🔍 AI Context debugging disabled');
  }

  async captureDebugSession(): Promise<DebugSession> {
    const startTime = Date.now();
    const contextData = await aiContextService.generateAIContext();
    const endTime = Date.now();

    const session: DebugSession = {
      id: `debug-${Date.now()}`,
      timestamp: new Date(),
      contextData,
      performance: {
        generationTime: endTime - startTime,
        cacheHit: false, // TODO: Get from service
        dataSize: JSON.stringify(contextData).length
      },
      userOverrides: { ...this.userOverrides }
    };

    this.debugSessions.push(session);
    
    // Keep only last 20 sessions
    if (this.debugSessions.length > 20) {
      this.debugSessions = this.debugSessions.slice(-20);
    }

    if (this.isDebugging) {
      console.log('🔍 Debug session captured:', session);
    }

    return session;
  }

  visualizeContext(contextData: AIContextData): ContextVisualization {
    const phases = contextData.implementationState.phases.map(phase => ({
      phase: phase.phase,
      completion: (phase.completedFeatures.length / 
                  (phase.completedFeatures.length + phase.pendingFeatures.length)) * 100,
      features: phase.completedFeatures,
      blockers: phase.validationStatus.warnings
    }));

    const capabilityCategories = new Map<string, string[]>();
    contextData.currentCapabilities.forEach(capability => {
      const category = this.categorizeCapability(capability);
      if (!capabilityCategories.has(category)) {
        capabilityCategories.set(category, []);
      }
      capabilityCategories.get(category)!.push(capability);
    });

    const capabilities = Array.from(capabilityCategories.entries()).map(([category, items]) => ({
      category,
      items
    }));

    const suggestions = contextData.suggestions.map(suggestion => ({
      priority: this.prioritizeSuggestion(suggestion) as 'high' | 'medium' | 'low',
      text: suggestion,
      category: this.categorizeSuggestion(suggestion)
    }));

    return { phases, capabilities, suggestions };
  }

  private categorizeCapability(capability: string): string {
    if (capability.includes('auth') || capability.includes('login')) return 'Authentication';
    if (capability.includes('permission') || capability.includes('role')) return 'Authorization';
    if (capability.includes('tenant') || capability.includes('isolation')) return 'Multi-tenancy';
    if (capability.includes('database') || capability.includes('query')) return 'Data';
    if (capability.includes('user') || capability.includes('profile')) return 'User Management';
    return 'Other';
  }

  private prioritizeSuggestion(suggestion: string): string {
    if (suggestion.includes('blocker') || suggestion.includes('critical')) return 'high';
    if (suggestion.includes('warning') || suggestion.includes('recommend')) return 'medium';
    return 'low';
  }

  private categorizeSuggestion(suggestion: string): string {
    if (suggestion.includes('performance')) return 'Performance';
    if (suggestion.includes('security')) return 'Security';
    if (suggestion.includes('test')) return 'Testing';
    if (suggestion.includes('implement')) return 'Implementation';
    return 'General';
  }

  setOverride(key: string, value: any): void {
    this.userOverrides[key] = value;
    console.log(`🔧 Override set: ${key} = ${JSON.stringify(value)}`);
  }

  removeOverride(key: string): void {
    delete this.userOverrides[key];
    console.log(`🔧 Override removed: ${key}`);
  }

  getOverrides(): Record<string, any> {
    return { ...this.userOverrides };
  }

  clearOverrides(): void {
    this.userOverrides = {};
    console.log('🔧 All overrides cleared');
  }

  getDebugSessions(): DebugSession[] {
    return [...this.debugSessions];
  }

  exportDebugData(): string {
    return JSON.stringify({
      sessions: this.debugSessions,
      overrides: this.userOverrides,
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  getPerformanceMetrics(): {
    averageGenerationTime: number;
    cacheHitRate: number;
    averageDataSize: number;
    sessionsCount: number;
  } {
    if (this.debugSessions.length === 0) {
      return {
        averageGenerationTime: 0,
        cacheHitRate: 0,
        averageDataSize: 0,
        sessionsCount: 0
      };
    }

    const totalTime = this.debugSessions.reduce((sum, s) => sum + s.performance.generationTime, 0);
    const cacheHits = this.debugSessions.filter(s => s.performance.cacheHit).length;
    const totalSize = this.debugSessions.reduce((sum, s) => sum + s.performance.dataSize, 0);

    return {
      averageGenerationTime: totalTime / this.debugSessions.length,
      cacheHitRate: (cacheHits / this.debugSessions.length) * 100,
      averageDataSize: totalSize / this.debugSessions.length,
      sessionsCount: this.debugSessions.length
    };
  }
}

export const aiContextDebugger = new AIContextDebuggerService();
