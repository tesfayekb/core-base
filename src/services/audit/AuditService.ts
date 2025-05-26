
// Audit Service - Main Entry Point
// Version: 1.0.0 - Centralized Audit Operations

import { enhancedAuditService } from './enhancedAuditService';
import { auditService as databaseAuditService } from '../database/auditService';

export interface AuditServiceInterface {
  logEvent(
    eventType: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void>;
  
  logAuthEvent(
    action: 'login' | 'logout' | 'register' | 'password_change' | 'session_expire',
    outcome: 'success' | 'failure' | 'error',
    userId?: string,
    details?: Record<string, any>,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      tenantId?: string;
    }
  ): Promise<void>;
  
  flush(): Promise<void>;
}

export class AuditService implements AuditServiceInterface {
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
  ): Promise<void> {
    try {
      await enhancedAuditService.logDataEvent(
        action as any,
        resourceType || 'unknown',
        resourceId || '',
        'success',
        undefined,
        details,
        { ipAddress, userAgent }
      );
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  async logAuthEvent(
    action: 'login' | 'logout' | 'register' | 'password_change' | 'session_expire',
    outcome: 'success' | 'failure' | 'error',
    userId?: string,
    details?: Record<string, any>,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      tenantId?: string;
    }
  ): Promise<void> {
    await enhancedAuditService.logAuthEvent(
      action,
      outcome,
      userId,
      details,
      context
    );
  }

  async flush(): Promise<void> {
    await enhancedAuditService.flush();
  }
}

export const auditService = AuditService.getInstance();
