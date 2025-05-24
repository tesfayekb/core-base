
// Audit Logging Service
// Version: 1.0.0
// Phase 1.2: Database Foundation - Audit System

import { supabase } from './connection';
import { DatabaseResult } from '@/types/database';

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

  async batchLogEvents(events: Array<{
    eventType: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }>): Promise<DatabaseResult<string[]>> {
    try {
      const results = await Promise.all(
        events.map(event => this.logEvent(
          event.eventType,
          event.action,
          event.resourceType,
          event.resourceId,
          event.details,
          event.ipAddress,
          event.userAgent
        ))
      );

      const failedEvents = results.filter(r => !r.success);
      if (failedEvents.length > 0) {
        return {
          success: false,
          error: `${failedEvents.length} audit events failed to log`,
          code: 'BATCH_AUDIT_PARTIAL_FAILURE'
        };
      }

      return { 
        success: true, 
        data: results.map(r => r.data as string) 
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BATCH_AUDIT_ERROR'
      };
    }
  }
}

export const auditService = AuditService.getInstance();
