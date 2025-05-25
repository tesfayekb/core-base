
// Shared Tenant Context Service - MANDATORY for all tenant operations
// Following src/docs/implementation/SHARED_PATTERNS.md
// Optimized according to PERFORMANCE_STANDARDS.md

import { supabase } from './database';
import { measureTenantQuery, measureAuthOperation } from './performance/DatabaseMeasurementUtilities';

export interface StandardResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Enhanced caching interfaces
interface TenantCacheEntry {
  tenantId: string;
  expiresAt: number;
}

interface TenantValidationCacheEntry {
  isValid: boolean;
  expiresAt: number;
}

export class SharedTenantContextService {
  private static instance: SharedTenantContextService;
  private currentTenantId: string | null = null;
  
  // Enhanced caching system
  private userTenantCache: Map<string, TenantCacheEntry> = new Map();
  private tenantValidationCache: Map<string, TenantValidationCacheEntry> = new Map();
  private tenantListCache: Map<string, { tenants: string[], expiresAt: number }> = new Map();
  
  // Cache TTL settings (more aggressive)
  private readonly USER_TENANT_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly VALIDATION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly TENANT_LIST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  static getInstance(): SharedTenantContextService {
    if (!SharedTenantContextService.instance) {
      SharedTenantContextService.instance = new SharedTenantContextService();
    }
    return SharedTenantContextService.instance;
  }
  
  // ENHANCED: Multi-layer caching for tenant context switching
  async setTenantContext(tenantId: string): Promise<StandardResult<void>> {
    try {
      await measureTenantQuery('set_tenant_context', async () => {
        this.currentTenantId = tenantId;
        
        // Set database context for RLS
        const { error } = await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
        if (error) {
          throw new Error(`Failed to set tenant context: ${error.message}`);
        }
        
        return { success: true };
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to set tenant context:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TENANT_CONTEXT_ERROR'
      };
    }
  }
  
  // ENHANCED: Aggressive caching for tenant validation
  async validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    const cacheKey = `${userId}:${tenantId}`;
    
    // Check cache first
    const cached = this.tenantValidationCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('🚀 Using cached tenant validation');
      return cached.isValid;
    }

    try {
      const isValid = await measureTenantQuery('validate_tenant_access', async () => {
        const { data, error } = await supabase
          .from('user_tenants')
          .select('id')
          .eq('user_id', userId)
          .eq('tenant_id', tenantId)
          .single();
        
        return !error && !!data;
      });

      // Cache the validation result
      this.tenantValidationCache.set(cacheKey, {
        isValid,
        expiresAt: Date.now() + this.VALIDATION_CACHE_TTL
      });

      return isValid;
    } catch (error) {
      console.error('Tenant access validation failed:', error);
      return false;
    }
  }

  // ENHANCED: Cached tenant switching with pre-validation
  async switchTenantContext(userId: string, tenantId: string): Promise<StandardResult<void>> {
    try {
      const hasAccess = await this.validateTenantAccess(userId, tenantId);
      if (!hasAccess) {
        return {
          success: false,
          error: 'No access to specified tenant',
          code: 'TENANT_ACCESS_DENIED'
        };
      }

      const result = await this.setTenantContext(tenantId);
      
      // Update user's current tenant cache
      if (result.success) {
        this.userTenantCache.set(userId, {
          tenantId,
          expiresAt: Date.now() + this.USER_TENANT_CACHE_TTL
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tenant switch failed',
        code: 'TENANT_SWITCH_ERROR'
      };
    }
  }
  
  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }

  clearContext(): void {
    this.currentTenantId = null;
  }

  // NEW: Get user's accessible tenants with aggressive caching
  async getUserTenants(userId: string): Promise<StandardResult<string[]>> {
    const cached = this.tenantListCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('🚀 Using cached tenant list');
      return { success: true, data: cached.tenants };
    }

    try {
      const tenants = await measureTenantQuery('get_user_tenants', async () => {
        const { data, error } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', userId);

        if (error) throw error;
        return data?.map(ut => ut.tenant_id) || [];
      });

      // Cache the tenant list
      this.tenantListCache.set(userId, {
        tenants,
        expiresAt: Date.now() + this.TENANT_LIST_CACHE_TTL
      });

      return { success: true, data: tenants };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user tenants',
        code: 'TENANT_LIST_ERROR'
      };
    }
  }

  // ENHANCED: Non-blocking user context setup with multi-layer caching
  async setUserContextAsync(userId: string): Promise<void> {
    try {
      // Check primary cache first
      const cached = this.userTenantCache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        console.log('🚀 Using cached tenant context:', cached.tenantId);
        await this.setTenantContext(cached.tenantId);
        return;
      }

      // Fetch user's default tenant with caching
      const tenantId = await this.fetchUserDefaultTenant(userId);

      if (tenantId) {
        // Cache the result for future use
        this.userTenantCache.set(userId, {
          tenantId,
          expiresAt: Date.now() + this.USER_TENANT_CACHE_TTL
        });

        await this.setTenantContext(tenantId);
        console.log('✅ Tenant context set asynchronously:', tenantId);
      }
    } catch (error) {
      console.warn('⚠️ Failed to set user context asynchronously:', error);
    }
  }

  // ENHANCED: Cached tenant fetching with fallback strategies
  private async fetchUserDefaultTenant(userId: string): Promise<string | null> {
    return await measureAuthOperation('get_user_default_tenant', async () => {
      // Try to get primary tenant first
      let { data, error } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      // If no primary tenant, get the first available
      if (error || !data) {
        const fallback = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', userId)
          .limit(1)
          .single();
        
        data = fallback.data;
        error = fallback.error;
      }

      if (error || !data) {
        console.warn('No tenant access found for user:', userId);
        return null;
      }

      return data.tenant_id;
    });
  }

  // ENHANCED: Blocking user context setup with comprehensive caching
  async setUserContext(userId: string): Promise<StandardResult<string>> {
    try {
      // Check cache first for maximum performance
      const cached = this.userTenantCache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        const setContextResult = await this.setTenantContext(cached.tenantId);
        if (!setContextResult.success) {
          return {
            success: false,
            error: setContextResult.error,
            code: setContextResult.code
          };
        }
        return { success: true, data: cached.tenantId };
      }

      const tenantId = await this.fetchUserDefaultTenant(userId);
      if (!tenantId) {
        return {
          success: false,
          error: 'No tenant access found for user',
          code: 'NO_TENANT_ACCESS'
        };
      }

      // Cache the result with extended TTL
      this.userTenantCache.set(userId, {
        tenantId,
        expiresAt: Date.now() + this.USER_TENANT_CACHE_TTL
      });

      const setContextResult = await this.setTenantContext(tenantId);
      if (!setContextResult.success) {
        return {
          success: false,
          error: setContextResult.error,
          code: setContextResult.code
        };
      }

      return { success: true, data: tenantId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set user context',
        code: 'USER_CONTEXT_ERROR'
      };
    }
  }

  // ENHANCED: Intelligent cache cleanup with performance metrics
  private cleanupCache(): void {
    const now = Date.now();
    let cleanedEntries = 0;

    // Clean user tenant cache
    for (const [userId, cached] of this.userTenantCache.entries()) {
      if (cached.expiresAt <= now) {
        this.userTenantCache.delete(userId);
        cleanedEntries++;
      }
    }

    // Clean validation cache
    for (const [key, cached] of this.tenantValidationCache.entries()) {
      if (cached.expiresAt <= now) {
        this.tenantValidationCache.delete(key);
        cleanedEntries++;
      }
    }

    // Clean tenant list cache
    for (const [userId, cached] of this.tenantListCache.entries()) {
      if (cached.expiresAt <= now) {
        this.tenantListCache.delete(userId);
        cleanedEntries++;
      }
    }

    if (cleanedEntries > 0) {
      console.log(`🧹 Cleaned ${cleanedEntries} expired cache entries`);
    }
  }

  // NEW: Cache statistics for monitoring
  getCacheStats() {
    return {
      userTenantCache: this.userTenantCache.size,
      tenantValidationCache: this.tenantValidationCache.size,
      tenantListCache: this.tenantListCache.size,
      totalCacheSize: this.userTenantCache.size + this.tenantValidationCache.size + this.tenantListCache.size
    };
  }

  // NEW: Force cache invalidation for specific user
  invalidateUserCache(userId: string): void {
    this.userTenantCache.delete(userId);
    this.tenantListCache.delete(userId);
    
    // Remove validation cache entries for this user
    for (const [key] of this.tenantValidationCache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.tenantValidationCache.delete(key);
      }
    }
  }

  // Enhanced constructor with more frequent cleanup
  constructor() {
    // Cleanup cache every 5 minutes for optimal performance
    setInterval(() => this.cleanupCache(), this.CLEANUP_INTERVAL);
  }
}

// Export singleton instance
export const tenantContextService = SharedTenantContextService.getInstance();
