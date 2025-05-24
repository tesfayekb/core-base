
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

export class SharedTenantContextService {
  private static instance: SharedTenantContextService;
  private currentTenantId: string | null = null;
  
  // Performance optimization: In-memory cache for user tenant mappings
  private userTenantCache: Map<string, { tenantId: string, expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes as per performance docs
  
  static getInstance(): SharedTenantContextService {
    if (!SharedTenantContextService.instance) {
      SharedTenantContextService.instance = new SharedTenantContextService();
    }
    return SharedTenantContextService.instance;
  }
  
  // MANDATORY: Performance measured tenant context switching
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
  
  // OPTIMIZED: Cached tenant validation with performance monitoring
  async validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    try {
      return await measureTenantQuery('validate_tenant_access', async () => {
        const { data, error } = await supabase
          .from('user_tenants')
          .select('id')
          .eq('user_id', userId)
          .eq('tenant_id', tenantId)
          .single();
        
        return !error && !!data;
      });
    } catch (error) {
      console.error('Tenant access validation failed:', error);
      return false;
    }
  }

  // MANDATORY: Switch tenant context with validation
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

      return await this.setTenantContext(tenantId);
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

  // OPTIMIZED: Non-blocking user context setup with caching
  async setUserContextAsync(userId: string): Promise<void> {
    try {
      // Check cache first for performance
      const cached = this.userTenantCache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        console.log('🚀 Using cached tenant context:', cached.tenantId);
        await this.setTenantContext(cached.tenantId);
        return;
      }

      // Fetch user's default tenant
      const tenantId = await this.fetchUserDefaultTenant(userId);

      if (tenantId) {
        // Cache the result for future use
        this.userTenantCache.set(userId, {
          tenantId,
          expiresAt: Date.now() + this.CACHE_TTL_MS
        });

        await this.setTenantContext(tenantId);
        console.log('✅ Tenant context set asynchronously:', tenantId);
      }
    } catch (error) {
      console.warn('⚠️ Failed to set user context asynchronously:', error);
      // Non-blocking: Don't throw, just log the warning
    }
  }

  // PERFORMANCE OPTIMIZATION: Separate method for tenant fetching
  private async fetchUserDefaultTenant(userId: string): Promise<string | null> {
    return await measureAuthOperation('get_user_default_tenant', async () => {
      const { data, error } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error || !data) {
        console.warn('No tenant access found for user:', userId);
        return null;
      }

      return data.tenant_id;
    });
  }

  // LEGACY: Blocking user context setup (for backward compatibility)
  async setUserContext(userId: string): Promise<StandardResult<string>> {
    try {
      // Check cache first for performance optimization
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

      // Cache the result
      this.userTenantCache.set(userId, {
        tenantId,
        expiresAt: Date.now() + this.CACHE_TTL_MS
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

  // PERFORMANCE: Clear expired cache entries
  private cleanupCache(): void {
    const now = Date.now();
    for (const [userId, cached] of this.userTenantCache.entries()) {
      if (cached.expiresAt <= now) {
        this.userTenantCache.delete(userId);
      }
    }
  }

  // PERFORMANCE: Periodic cache cleanup
  constructor() {
    // Cleanup cache every 10 minutes
    setInterval(() => this.cleanupCache(), 10 * 60 * 1000);
  }
}

// Export singleton instance
export const tenantContextService = SharedTenantContextService.getInstance();
