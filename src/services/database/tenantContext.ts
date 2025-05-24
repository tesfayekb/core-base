
// Tenant Context Management Service
// Version: 2.0.0
// Phase 1.2: Database Foundation - Enhanced Tenant Context

import { supabase } from './connection';
import { DatabaseResult } from '@/types/database';

export class TenantContextService {
  private static instance: TenantContextService;
  private currentTenantId: string | null = null;
  private currentUserId: string | null = null;

  static getInstance(): TenantContextService {
    if (!TenantContextService.instance) {
      TenantContextService.instance = new TenantContextService();
    }
    return TenantContextService.instance;
  }

  async setTenantContext(tenantId: string): Promise<DatabaseResult<boolean>> {
    try {
      const { error } = await supabase.rpc('set_tenant_context', { 
        tenant_id: tenantId 
      });

      if (error) {
        return { 
          success: false, 
          error: error.message, 
          code: 'TENANT_CONTEXT_ERROR' 
        };
      }

      this.currentTenantId = tenantId;
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TENANT_CONTEXT_FAILED'
      };
    }
  }

  async setUserContext(userId: string): Promise<DatabaseResult<boolean>> {
    try {
      const { error } = await supabase.rpc('set_user_context', { 
        user_id: userId 
      });

      if (error) {
        return { 
          success: false, 
          error: error.message, 
          code: 'USER_CONTEXT_ERROR' 
        };
      }

      this.currentUserId = userId;
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'USER_CONTEXT_FAILED'
      };
    }
  }

  async validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('validate_tenant_access', {
        p_user_id: userId,
        p_tenant_id: tenantId
      });

      return !error && !!data;
    } catch (error) {
      console.error('Tenant access validation failed:', error);
      return false;
    }
  }

  async switchTenantContext(userId: string, tenantId: string): Promise<DatabaseResult<boolean>> {
    try {
      const { data, error } = await supabase.rpc('switch_tenant_context', {
        p_user_id: userId,
        p_tenant_id: tenantId
      });

      if (error || !data) {
        return { 
          success: false, 
          error: 'Failed to switch tenant context', 
          code: 'TENANT_SWITCH_FAILED' 
        };
      }

      this.currentTenantId = tenantId;
      this.currentUserId = userId;
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TENANT_SWITCH_ERROR'
      };
    }
  }

  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  clearContext(): void {
    this.currentTenantId = null;
    this.currentUserId = null;
  }
}

export const tenantContextService = TenantContextService.getInstance();
