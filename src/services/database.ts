// Database Service with Tenant Context Management
// Version: 1.0.0
// Phase 1.1: Database Foundation

import { createClient } from '@supabase/supabase-js';
import { DatabaseResult, PermissionCheck, EffectivePermission } from '@/types/database';

// Initialize Supabase client with your project details
const supabaseUrl = 'https://fhzhlyskafjvcwcqjssmb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk';

// Validate configuration
console.log('Initializing Supabase with:');
console.log('URL:', supabaseUrl);
console.log('Key valid:', supabaseAnonKey?.length > 0);
console.log('Using anon key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase configuration missing!');
  console.error('URL:', supabaseUrl);
  console.error('Key present:', !!supabaseAnonKey);
  throw new Error('Supabase configuration is incomplete');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'lovable-project'
    }
  }
});

// Test connection on initialization with detailed logging
console.log('Testing Supabase connection...');
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection test failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
  } else {
    console.log('Supabase connection test successful:', !!data);
    console.log('Session data present:', !!data.session);
  }
}).catch(err => {
  console.error('Failed to test Supabase connection:', err);
  console.error('Connection error type:', typeof err);
  console.error('Connection error name:', err?.name);
});

// Tenant Context Service (Singleton)
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

// Permission Service
export class PermissionService {
  private static instance: PermissionService;

  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  async checkPermission(check: PermissionCheck): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: check.userId,
        p_action: check.action,
        p_resource: check.resource,
        p_resource_id: check.resourceId || null
      });

      if (error) {
        console.error('Permission check error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  async getUserPermissions(userId: string): Promise<EffectivePermission[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId
      });

      if (error) {
        console.error('Get user permissions error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get user permissions failed:', error);
      return [];
    }
  }
}

// Audit Service
export class AuditService {
  private static instance: AuditService;

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async logEvent(
    eventType: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<DatabaseResult<string>> {
    try {
      const { data, error } = await supabase.rpc('log_audit_event', {
        p_event_type: eventType,
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_details: details,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

      if (error) {
        return { 
          success: false, 
          error: error.message, 
          code: 'AUDIT_LOG_FAILED' 
        };
      }

      return { success: true, data: data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'AUDIT_LOG_ERROR'
      };
    }
  }
}

// Export service instances
export const tenantContextService = TenantContextService.getInstance();
export const permissionService = PermissionService.getInstance();
export const auditService = AuditService.getInstance();
