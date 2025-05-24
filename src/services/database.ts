
// Database Service with Tenant Context Management - Refactored
// Version: 2.0.0 - Refactored for better maintainability

import { DatabaseResult, PermissionCheck, EffectivePermission } from '@/types/database';
import { connectionService, supabase } from './database/core/ConnectionService';
import { tenantContextService } from './database/core/TenantContextService';

// Re-export services for backward compatibility
export { supabase, tenantContextService };

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
export const permissionService = PermissionService.getInstance();
export const auditService = AuditService.getInstance();
