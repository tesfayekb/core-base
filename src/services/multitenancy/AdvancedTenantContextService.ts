/**
 * Advanced Tenant Context Service
 * Enhanced multi-tenant context management with validation, caching, and monitoring
 * Provides comprehensive tenant isolation and context switching capabilities
 */

import { LRUCache } from 'lru-cache';

export interface TenantContext {
  tenantId: string;
  organizationName: string;
  domain: string;
  settings: TenantSettings;
  features: TenantFeatures;
  quotas: TenantQuotas;
  lastAccessed: number;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface TenantSettings {
  timezone: string;
  locale: string;
  dateFormat: string;
  currency: string;
  theme: string;
  customization: {
    logo?: string;
    primaryColor?: string;
    brandName?: string;
  };
  security: {
    sessionTimeout: number;
    mfaRequired: boolean;
    passwordPolicy: string;
    allowedDomains: string[];
  };
}

export interface TenantFeatures {
  advancedRBAC: boolean;
  auditLogging: boolean;
  analytics: boolean;
  apiAccess: boolean;
  customIntegrations: boolean;
  maxUsers: number;
  storageLimit: number;
}

export interface TenantQuotas {
  maxUsers: number;
  maxStorageGB: number;
  maxAPICallsPerMonth: number;
  currentUsers: number;
  currentStorageGB: number;
  currentAPICallsThisMonth: number;
  lastUpdated: number;
}

export interface TenantValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    validationTime: number;
    cacheHit: boolean;
  };
}

export interface TenantSwitchingMetrics {
  switchCount: number;
  averageSwitchTime: number;
  failureRate: number;
  lastSwitchTime: number;
  tenantUsageHistory: Array<{
    tenantId: string;
    timestamp: number;
    duration: number;
  }>;
}

export class AdvancedTenantContextService {
  private static instance: AdvancedTenantContextService;
  private currentTenantContext: TenantContext | null = null;
  private tenantCache: LRUCache<string, TenantContext>;
  private validationCache: LRUCache<string, TenantValidationResult>;
  private switchingMetrics: TenantSwitchingMetrics;
  private contextListeners: Array<(context: TenantContext | null) => void> = [];

  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly VALIDATION_CACHE_TTL = 60000; // 1 minute
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    this.tenantCache = new LRUCache<string, TenantContext>({
      max: this.MAX_CACHE_SIZE,
      ttl: this.CACHE_TTL,
      allowStale: true,
      updateAgeOnGet: true
    });

    this.validationCache = new LRUCache<string, TenantValidationResult>({
      max: 500,
      ttl: this.VALIDATION_CACHE_TTL,
      allowStale: false
    });

    this.switchingMetrics = {
      switchCount: 0,
      averageSwitchTime: 0,
      failureRate: 0,
      lastSwitchTime: 0,
      tenantUsageHistory: []
    };
  }

  static getInstance(): AdvancedTenantContextService {
    if (!AdvancedTenantContextService.instance) {
      AdvancedTenantContextService.instance = new AdvancedTenantContextService();
    }
    return AdvancedTenantContextService.instance;
  }

  /**
   * Sets the current tenant context with comprehensive validation and monitoring
   * Includes performance tracking and error handling
   */
  async setTenantContext(tenantId: string, options: { 
    validateQuotas?: boolean; 
    skipCache?: boolean;
    forceSwitch?: boolean;
  } = {}): Promise<TenantValidationResult> {
    const startTime = performance.now();
    
    try {
      // Validate tenant before switching
      const validationResult = await this.validateTenant(tenantId, options);
      
      if (!validationResult.isValid && !options.forceSwitch) {
        this.recordSwitchFailure(tenantId, performance.now() - startTime);
        return validationResult;
      }

      // Load tenant context
      const tenantContext = await this.loadTenantContext(tenantId, options.skipCache);
      
      if (!tenantContext) {
        const error = `Tenant ${tenantId} not found`;
        this.recordSwitchFailure(tenantId, performance.now() - startTime);
        return {
          isValid: false,
          errors: [error],
          warnings: [],
          performance: {
            validationTime: performance.now() - startTime,
            cacheHit: false
          }
        };
      }

      // Update context and metrics
      const previousContext = this.currentTenantContext;
      this.currentTenantContext = tenantContext;
      this.updateTenantAccess(tenantId);
      this.recordSuccessfulSwitch(tenantId, performance.now() - startTime);

      // Notify listeners
      this.notifyContextChange(tenantContext);

      // Log context switch for audit
      console.log(`Tenant context switched to ${tenantId}`, {
        previousTenant: previousContext?.tenantId,
        switchTime: performance.now() - startTime,
        cacheHit: validationResult.performance.cacheHit
      });

      return {
        isValid: true,
        errors: [],
        warnings: validationResult.warnings,
        performance: {
          validationTime: performance.now() - startTime,
          cacheHit: this.tenantCache.has(tenantId)
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.recordSwitchFailure(tenantId, performance.now() - startTime);
      
      return {
        isValid: false,
        errors: [`Failed to switch tenant context: ${errorMessage}`],
        warnings: [],
        performance: {
          validationTime: performance.now() - startTime,
          cacheHit: false
        }
      };
    }
  }

  /**
   * Validates tenant availability, quotas, and permissions
   * Provides comprehensive validation with caching for performance
   */
  async validateTenant(
    tenantId: string, 
    options: { validateQuotas?: boolean } = {}
  ): Promise<TenantValidationResult> {
    const startTime = performance.now();
    const cacheKey = `${tenantId}:${options.validateQuotas ? 'full' : 'basic'}`;
    
    // Check validation cache first
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey)!;
      return {
        ...cached,
        performance: {
          ...cached.performance,
          validationTime: performance.now() - startTime,
          cacheHit: true
        }
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic tenant existence validation
      const tenantExists = await this.checkTenantExists(tenantId);
      if (!tenantExists) {
        errors.push(`Tenant ${tenantId} does not exist`);
      }

      // Tenant active status validation
      const tenantActive = await this.checkTenantActive(tenantId);
      if (!tenantActive) {
        errors.push(`Tenant ${tenantId} is not active`);
      }

      // Quota validation if requested
      if (options.validateQuotas && errors.length === 0) {
        const quotaValidation = await this.validateTenantQuotas(tenantId);
        errors.push(...quotaValidation.errors);
        warnings.push(...quotaValidation.warnings);
      }

      // Feature availability validation
      const featureValidation = await this.validateTenantFeatures(tenantId);
      warnings.push(...featureValidation.warnings);

      const result: TenantValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        performance: {
          validationTime: performance.now() - startTime,
          cacheHit: false
        }
      };

      // Cache the validation result
      this.validationCache.set(cacheKey, result);
      
      return result;

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        performance: {
          validationTime: performance.now() - startTime,
          cacheHit: false
        }
      };
    }
  }

  /**
   * Gets current tenant context with validation
   * Ensures context is still valid and refreshes if needed
   */
  getCurrentTenantContext(validateCurrent = false): TenantContext | null {
    if (!this.currentTenantContext) {
      return null;
    }

    if (validateCurrent) {
      // Check if context is still valid (not expired)
      const contextAge = Date.now() - this.currentTenantContext.lastAccessed;
      if (contextAge > this.CACHE_TTL) {
        console.warn('Current tenant context has expired, clearing context');
        this.currentTenantContext = null;
        return null;
      }
    }

    return this.currentTenantContext;
  }

  /**
   * Clears tenant context with proper cleanup
   * Includes metrics update and listener notification
   */
  clearTenantContext(): void {
    const previousContext = this.currentTenantContext;
    this.currentTenantContext = null;
    
    if (previousContext) {
      this.recordContextEnd(previousContext.tenantId);
      this.notifyContextChange(null);
      
      console.log(`Tenant context cleared for ${previousContext.tenantId}`);
    }
  }

  /**
   * Subscribes to tenant context changes
   * Allows components to react to context switches
   */
  onContextChange(listener: (context: TenantContext | null) => void): () => void {
    this.contextListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.contextListeners.indexOf(listener);
      if (index > -1) {
        this.contextListeners.splice(index, 1);
      }
    };
  }

  /**
   * Gets comprehensive tenant switching metrics
   * Provides insights into tenant usage patterns and performance
   */
  getSwitchingMetrics(): TenantSwitchingMetrics & {
    cacheStats: {
      size: number;
      hitRate: number;
      validationCacheSize: number;
    };
    recentSwitches: Array<{
      tenantId: string;
      timestamp: number;
      success: boolean;
      duration: number;
    }>;
  } {
    const recentSwitches = this.switchingMetrics.tenantUsageHistory
      .slice(-10)
      .map(entry => ({
        ...entry,
        success: true // Successful switches are recorded in usage history
      }));

    return {
      ...this.switchingMetrics,
      cacheStats: {
        size: this.tenantCache.size,
        hitRate: this.calculateCacheHitRate(),
        validationCacheSize: this.validationCache.size
      },
      recentSwitches
    };
  }

  /**
   * Preloads tenant contexts for improved performance
   * Warms cache with frequently accessed tenants
   */
  async preloadTenantContexts(tenantIds: string[]): Promise<{
    successful: string[];
    failed: Array<{ tenantId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ tenantId: string; error: string }> = [];

    const preloadPromises = tenantIds.map(async (tenantId) => {
      try {
        await this.loadTenantContext(tenantId, false);
        successful.push(tenantId);
      } catch (error) {
        failed.push({
          tenantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.allSettled(preloadPromises);

    console.log(`Preloaded ${successful.length} tenant contexts, ${failed.length} failed`);
    
    return { successful, failed };
  }

  // Private helper methods

  private async loadTenantContext(tenantId: string, skipCache = false): Promise<TenantContext | null> {
    if (!skipCache && this.tenantCache.has(tenantId)) {
      return this.tenantCache.get(tenantId)!;
    }

    try {
      // Simulate loading tenant from database
      // In real implementation, this would be a database query
      const tenantContext: TenantContext = {
        tenantId,
        organizationName: `Organization ${tenantId}`,
        domain: `${tenantId}.example.com`,
        settings: {
          timezone: 'UTC',
          locale: 'en-US',
          dateFormat: 'MM/dd/yyyy',
          currency: 'USD',
          theme: 'default',
          customization: {
            brandName: `${tenantId} Brand`
          },
          security: {
            sessionTimeout: 3600000,
            mfaRequired: false,
            passwordPolicy: 'standard',
            allowedDomains: [`${tenantId}.example.com`]
          }
        },
        features: {
          advancedRBAC: true,
          auditLogging: true,
          analytics: true,
          apiAccess: true,
          customIntegrations: false,
          maxUsers: 100,
          storageLimit: 10
        },
        quotas: {
          maxUsers: 100,
          maxStorageGB: 10,
          maxAPICallsPerMonth: 10000,
          currentUsers: Math.floor(Math.random() * 50),
          currentStorageGB: Math.floor(Math.random() * 5),
          currentAPICallsThisMonth: Math.floor(Math.random() * 5000),
          lastUpdated: Date.now()
        },
        lastAccessed: Date.now(),
        isActive: true,
        metadata: {}
      };

      this.tenantCache.set(tenantId, tenantContext);
      return tenantContext;

    } catch (error) {
      console.error(`Failed to load tenant context for ${tenantId}:`, error);
      return null;
    }
  }

  private async checkTenantExists(tenantId: string): Promise<boolean> {
    // Simulate tenant existence check
    return tenantId.length > 0 && !tenantId.includes('invalid');
  }

  private async checkTenantActive(tenantId: string): Promise<boolean> {
    // Simulate tenant active status check
    return !tenantId.includes('inactive');
  }

  private async validateTenantQuotas(tenantId: string): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const context = await this.loadTenantContext(tenantId);
      if (!context) {
        errors.push('Unable to load tenant context for quota validation');
        return { errors, warnings };
      }

      const { quotas } = context;

      // Check user quota
      if (quotas.currentUsers >= quotas.maxUsers) {
        errors.push(`User quota exceeded: ${quotas.currentUsers}/${quotas.maxUsers}`);
      } else if (quotas.currentUsers / quotas.maxUsers > 0.9) {
        warnings.push(`User quota at ${Math.round((quotas.currentUsers / quotas.maxUsers) * 100)}%`);
      }

      // Check storage quota
      if (quotas.currentStorageGB >= quotas.maxStorageGB) {
        errors.push(`Storage quota exceeded: ${quotas.currentStorageGB}/${quotas.maxStorageGB}GB`);
      } else if (quotas.currentStorageGB / quotas.maxStorageGB > 0.9) {
        warnings.push(`Storage quota at ${Math.round((quotas.currentStorageGB / quotas.maxStorageGB) * 100)}%`);
      }

      // Check API quota
      if (quotas.currentAPICallsThisMonth >= quotas.maxAPICallsPerMonth) {
        errors.push(`API quota exceeded: ${quotas.currentAPICallsThisMonth}/${quotas.maxAPICallsPerMonth}`);
      } else if (quotas.currentAPICallsThisMonth / quotas.maxAPICallsPerMonth > 0.9) {
        warnings.push(`API quota at ${Math.round((quotas.currentAPICallsThisMonth / quotas.maxAPICallsPerMonth) * 100)}%`);
      }

    } catch (error) {
      errors.push(`Quota validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { errors, warnings };
  }

  private async validateTenantFeatures(tenantId: string): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    try {
      const context = await this.loadTenantContext(tenantId);
      if (!context) {
        return { warnings };
      }

      const { features } = context;

      if (!features.advancedRBAC) {
        warnings.push('Advanced RBAC features not available for this tenant');
      }

      if (!features.analytics) {
        warnings.push('Analytics features not available for this tenant');
      }

    } catch (error) {
      warnings.push(`Feature validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { warnings };
  }

  private updateTenantAccess(tenantId: string): void {
    if (this.currentTenantContext) {
      this.currentTenantContext.lastAccessed = Date.now();
    }
  }

  private recordSuccessfulSwitch(tenantId: string, duration: number): void {
    this.switchingMetrics.switchCount++;
    this.switchingMetrics.lastSwitchTime = Date.now();
    
    // Update average switch time
    const totalTime = this.switchingMetrics.averageSwitchTime * (this.switchingMetrics.switchCount - 1) + duration;
    this.switchingMetrics.averageSwitchTime = totalTime / this.switchingMetrics.switchCount;

    // Record usage history
    this.switchingMetrics.tenantUsageHistory.push({
      tenantId,
      timestamp: Date.now(),
      duration
    });

    // Keep only last 100 entries
    if (this.switchingMetrics.tenantUsageHistory.length > 100) {
      this.switchingMetrics.tenantUsageHistory = this.switchingMetrics.tenantUsageHistory.slice(-100);
    }
  }

  private recordSwitchFailure(tenantId: string, duration: number): void {
    const totalAttempts = this.switchingMetrics.switchCount + 1;
    this.switchingMetrics.failureRate = (this.switchingMetrics.failureRate * this.switchingMetrics.switchCount + 1) / totalAttempts;
    
    console.error(`Tenant switch failed for ${tenantId} (${duration.toFixed(2)}ms)`);
  }

  private recordContextEnd(tenantId: string): void {
    const lastUsage = this.switchingMetrics.tenantUsageHistory.find(
      entry => entry.tenantId === tenantId
    );
    
    if (lastUsage) {
      lastUsage.duration = Date.now() - lastUsage.timestamp;
    }
  }

  private notifyContextChange(context: TenantContext | null): void {
    this.contextListeners.forEach(listener => {
      try {
        listener(context);
      } catch (error) {
        console.error('Error in tenant context listener:', error);
      }
    });
  }

  private calculateCacheHitRate(): number {
    // Simplified cache hit rate calculation
    // In a real implementation, this would track actual hits/misses
    return 0.95; // Mock 95% hit rate
  }
}

export const advancedTenantContextService = AdvancedTenantContextService.getInstance();
