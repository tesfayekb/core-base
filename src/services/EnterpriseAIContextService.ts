
// Enterprise AI Context Service
// Enhanced with audit trail, metrics, configuration management, and multi-tenant awareness

import { AIContextData, ImplementationState } from '@/types/ImplementationState';
import { implementationStateScanner } from './ImplementationStateScanner';
import { versionTracker } from './VersionTracker';
import { enhancedAuditService } from './audit/enhancedAuditService';
import { detailedMetricsCollector } from './performance/DetailedMetricsCollector';

export interface EnterpriseConfig {
  tenantId?: string;
  features: {
    auditTrail: boolean;
    metricsCollection: boolean;
    performanceOptimization: boolean;
    realTimeUpdates: boolean;
  };
  thresholds: {
    cacheExpiryMinutes: number;
    performanceWarningMs: number;
    maxContextSizeMB: number;
  };
  tenantSettings?: {
    customFeatures: string[];
    restrictedOperations: string[];
    auditLevel: 'basic' | 'detailed' | 'comprehensive';
  };
}

interface ContextGenerationMetrics {
  duration: number;
  contextSize: number;
  cacheHit: boolean;
  tenantId?: string;
  features: string[];
  warnings: string[];
}

class EnterpriseAIContextService {
  private static instance: EnterpriseAIContextService;
  private cache: Map<string, AIContextData> = new Map();
  private cacheTimestamps: Map<string, Date> = new Map();
  private config: EnterpriseConfig;
  private metrics: ContextGenerationMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;

  constructor() {
    this.config = this.loadDefaultConfig();
  }

  static getInstance(): EnterpriseAIContextService {
    if (!EnterpriseAIContextService.instance) {
      EnterpriseAIContextService.instance = new EnterpriseAIContextService();
    }
    return EnterpriseAIContextService.instance;
  }

  async generateAIContext(tenantId?: string): Promise<AIContextData> {
    const startTime = performance.now();
    const contextKey = this.getContextKey(tenantId);
    
    try {
      console.log(`🔍 Generating AI context for tenant: ${tenantId || 'default'}`);

      // Check tenant-specific cache
      if (this.isCacheValid(contextKey)) {
        await this.logContextAccess('cache_hit', tenantId);
        const cachedData = this.cache.get(contextKey)!;
        
        this.recordMetrics({
          duration: performance.now() - startTime,
          contextSize: JSON.stringify(cachedData).length,
          cacheHit: true,
          tenantId,
          features: this.getEnabledFeatures(),
          warnings: []
        });
        
        return cachedData;
      }

      // Generate fresh context with tenant awareness
      const implementationState = await implementationStateScanner.scanImplementationState();
      const recentChanges = versionTracker.getRecentChanges(24);
      const changeReport = versionTracker.generateChangeReport();

      // Apply tenant-specific filtering and features
      const contextData = await this.buildTenantAwareContext(
        implementationState,
        changeReport,
        tenantId
      );

      // Update cache
      this.cache.set(contextKey, contextData);
      this.cacheTimestamps.set(contextKey, new Date());

      // Audit context generation
      await this.logContextAccess('generation', tenantId, {
        contextSize: JSON.stringify(contextData).length,
        features: this.getEnabledFeatures(),
        duration: performance.now() - startTime
      });

      // Collect performance metrics
      if (this.config.features.metricsCollection) {
        await this.collectContextMetrics(contextData, tenantId);
      }

      this.recordMetrics({
        duration: performance.now() - startTime,
        contextSize: JSON.stringify(contextData).length,
        cacheHit: false,
        tenantId,
        features: this.getEnabledFeatures(),
        warnings: this.validateContextData(contextData)
      });

      console.log(`✅ AI context generated for tenant: ${tenantId || 'default'}`);
      return contextData;

    } catch (error) {
      await this.logContextAccess('error', tenantId, { error: error.message });
      
      this.recordMetrics({
        duration: performance.now() - startTime,
        contextSize: 0,
        cacheHit: false,
        tenantId,
        features: this.getEnabledFeatures(),
        warnings: [`Context generation failed: ${error.message}`]
      });

      console.error(`❌ Failed to generate AI context for tenant ${tenantId}:`, error);
      return this.getEmptyContext(tenantId);
    }
  }

  private async buildTenantAwareContext(
    implementationState: ImplementationState,
    changeReport: any,
    tenantId?: string
  ): Promise<AIContextData> {
    const tenantConfig = this.getTenantConfig(tenantId);
    
    // Filter features based on tenant configuration
    const filteredState = this.applyTenantFiltering(implementationState, tenantConfig);
    
    const contextData: AIContextData = {
      implementationState: filteredState,
      currentCapabilities: this.extractCapabilities(filteredState, tenantConfig),
      completedFeatures: this.extractCompletedFeatures(filteredState, tenantConfig),
      activeValidations: this.extractActiveValidations(filteredState),
      suggestions: this.generateTenantSpecificSuggestions(filteredState, changeReport, tenantConfig)
    };

    return contextData;
  }

  private async logContextAccess(
    action: 'generation' | 'cache_hit' | 'invalidation' | 'error',
    tenantId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    if (!this.config.features.auditTrail) return;

    const auditLevel = this.getTenantConfig(tenantId)?.auditLevel || 'basic';
    
    if (auditLevel === 'basic' && action === 'cache_hit') return;

    await enhancedAuditService.logDataEvent(
      'read',
      'ai_context',
      tenantId || 'system',
      'success',
      undefined,
      {
        action,
        tenantId,
        config: auditLevel === 'comprehensive' ? this.config : undefined,
        ...details
      },
      { tenantId }
    );
  }

  private async collectContextMetrics(
    contextData: AIContextData,
    tenantId?: string
  ): Promise<void> {
    try {
      const metrics = await detailedMetricsCollector.collectMetrics();
      
      // Log performance if exceeding thresholds
      if (metrics.system.responseTime > this.config.thresholds.performanceWarningMs) {
        console.warn(`⚠️ Context generation exceeded performance threshold: ${metrics.system.responseTime}ms`);
        
        await enhancedAuditService.logSecurityEvent(
          'performance_warning',
          'success',
          {
            responseTime: metrics.system.responseTime,
            threshold: this.config.thresholds.performanceWarningMs,
            tenantId
          },
          { tenantId }
        );
      }
    } catch (error) {
      console.error('Failed to collect context metrics:', error);
    }
  }

  updateConfiguration(config: Partial<EnterpriseConfig>, tenantId?: string): void {
    this.config = { ...this.config, ...config };
    
    console.log(`⚙️ Enterprise AI Context configuration updated for tenant: ${tenantId || 'default'}`);
    
    // Invalidate cache for tenant if configuration changed
    if (tenantId) {
      const contextKey = this.getContextKey(tenantId);
      this.cache.delete(contextKey);
      this.cacheTimestamps.delete(contextKey);
    } else {
      // Clear all cache if global config changed
      this.cache.clear();
      this.cacheTimestamps.clear();
    }
  }

  getMetrics(tenantId?: string): ContextGenerationMetrics[] {
    if (tenantId) {
      return this.metrics.filter(m => m.tenantId === tenantId);
    }
    return [...this.metrics];
  }

  getPerformanceInsights(tenantId?: string): string[] {
    const metrics = this.getMetrics(tenantId);
    if (metrics.length === 0) return ['No metrics available'];

    const insights: string[] = [];
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const cacheHitRate = metrics.filter(m => m.cacheHit).length / metrics.length;

    if (avgDuration > this.config.thresholds.performanceWarningMs) {
      insights.push(`Average context generation time is high: ${avgDuration.toFixed(2)}ms`);
    }

    if (cacheHitRate < 0.7) {
      insights.push(`Cache hit rate is low: ${(cacheHitRate * 100).toFixed(1)}%`);
    }

    const warnings = metrics.flatMap(m => m.warnings);
    if (warnings.length > 0) {
      insights.push(`Recent warnings: ${[...new Set(warnings)].join(', ')}`);
    }

    return insights.length > 0 ? insights : ['Performance is optimal'];
  }

  private loadDefaultConfig(): EnterpriseConfig {
    return {
      features: {
        auditTrail: true,
        metricsCollection: true,
        performanceOptimization: true,
        realTimeUpdates: true
      },
      thresholds: {
        cacheExpiryMinutes: 15,
        performanceWarningMs: 1000,
        maxContextSizeMB: 10
      }
    };
  }

  private getContextKey(tenantId?: string): string {
    return `context_${tenantId || 'default'}`;
  }

  private isCacheValid(contextKey: string): boolean {
    if (!this.cache.has(contextKey) || !this.cacheTimestamps.has(contextKey)) {
      return false;
    }

    const cacheTime = this.cacheTimestamps.get(contextKey)!;
    const expiryTime = new Date(cacheTime.getTime() + this.config.thresholds.cacheExpiryMinutes * 60 * 1000);
    
    return new Date() < expiryTime;
  }

  private getTenantConfig(tenantId?: string) {
    // In a real implementation, this would fetch from database
    return this.config.tenantSettings;
  }

  private applyTenantFiltering(state: ImplementationState, tenantConfig?: any): ImplementationState {
    if (!tenantConfig?.restrictedOperations) return state;

    // Apply tenant-specific filtering
    return {
      ...state,
      recommendations: state.recommendations.filter(
        rec => !tenantConfig.restrictedOperations.includes(rec)
      )
    };
  }

  private extractCapabilities(state: ImplementationState, tenantConfig?: any): string[] {
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
          case 'Enhanced RBAC':
            capabilities.push('Permission caching', 'Advanced permissions', 'Entity boundaries');
            break;
        }
      });
    });

    // Add tenant-specific capabilities
    if (tenantConfig?.customFeatures) {
      capabilities.push(...tenantConfig.customFeatures);
    }

    return [...new Set(capabilities)];
  }

  private extractCompletedFeatures(state: ImplementationState, tenantConfig?: any): string[] {
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

  private generateTenantSpecificSuggestions(
    state: ImplementationState,
    changeReport: any,
    tenantConfig?: any
  ): string[] {
    const suggestions: string[] = [];
    
    suggestions.push(...state.recommendations);
    
    if (changeReport.velocity > 10) {
      suggestions.push('Consider stabilizing recent changes before adding new features');
    }
    
    const currentPhase = state.phases.find(p => p.phase === state.currentPhase);
    if (currentPhase && currentPhase.pendingFeatures.length > 0) {
      suggestions.push(`Next: Implement ${currentPhase.pendingFeatures[0]}`);
    }
    
    if (state.blockers.length > 0) {
      suggestions.push('Resolve current blockers before proceeding');
    }

    // Add tenant-specific suggestions
    if (tenantConfig?.auditLevel === 'basic') {
      suggestions.push('Consider upgrading to detailed audit level for better compliance');
    }

    return suggestions;
  }

  private validateContextData(contextData: AIContextData): string[] {
    const warnings: string[] = [];
    
    const contextSize = JSON.stringify(contextData).length / (1024 * 1024); // MB
    if (contextSize > this.config.thresholds.maxContextSizeMB) {
      warnings.push(`Context size exceeds threshold: ${contextSize.toFixed(2)}MB`);
    }

    if (contextData.completedFeatures.length === 0) {
      warnings.push('No completed features detected');
    }

    if (contextData.implementationState.blockers.length > 3) {
      warnings.push('High number of blockers detected');
    }

    return warnings;
  }

  private recordMetrics(metrics: ContextGenerationMetrics): void {
    this.metrics.push(metrics);
    
    // Limit metrics history
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  private getEnabledFeatures(): string[] {
    return Object.entries(this.config.features)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => feature);
  }

  private getEmptyContext(tenantId?: string): AIContextData {
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
}

export const enterpriseAIContextService = EnterpriseAIContextService.getInstance();
