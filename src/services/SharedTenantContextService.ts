
// Shared Tenant Context Service - MANDATORY for all tenant operations
// Following src/docs/implementation/SHARED_PATTERNS.md

import { supabase } from './database';
import { measureTenantQuery } from './performance/DatabaseMeasurementUtilities';

export interface StandardResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class SharedTenantContextService {
  private static instance: SharedTenantContextService;
  private currentTenantId: string | null = null;
  
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
  
  // MANDATORY: Performance measured tenant validation
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

  // MANDATORY: Set user context (determines default tenant)
  async setUserContext(userId: string): Promise<StandardResult<string>> {
    try {
      const tenantId = await measureTenantQuery('get_user_default_tenant', async () => {
        const { data, error } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (error || !data) {
          throw new Error('No tenant access found for user');
        }

        return data.tenant_id;
      });

      const result = await this.setTenantContext(tenantId);
      if (!result.success) {
        return result;
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
}

// Export singleton instance
export const tenantContextService = SharedTenantContextService.getInstance();
