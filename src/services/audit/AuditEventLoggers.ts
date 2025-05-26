
// Specialized Audit Event Loggers
// Part of Enhanced Audit Service refactoring

import { auditEventQueue, AuditEvent } from './AuditEventQueue';

export class AuditEventLoggers {
  private static instance: AuditEventLoggers;

  static getInstance(): AuditEventLoggers {
    if (!AuditEventLoggers.instance) {
      AuditEventLoggers.instance = new AuditEventLoggers();
    }
    return AuditEventLoggers.instance;
  }

  // Authentication Events
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
    const event: AuditEvent = {
      eventType: 'authentication',
      action: `auth.${action}`,
      outcome,
      userId,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      ...context
    };

    await auditEventQueue.queueEvent(event);
  }

  // RBAC Events
  async logRBACEvent(
    action: 'permission_check' | 'role_assign' | 'role_remove' | 'permission_grant' | 'permission_revoke',
    outcome: 'success' | 'failure' | 'error',
    details: {
      userId?: string;
      targetUserId?: string;
      resource?: string;
      permission?: string;
      roleId?: string;
      granted?: boolean;
    },
    context?: {
      tenantId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    const event: AuditEvent = {
      eventType: 'rbac',
      action: `rbac.${action}`,
      resourceType: details.resource,
      resourceId: details.targetUserId || details.roleId,
      outcome,
      userId: details.userId,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      ...context
    };

    await auditEventQueue.queueEvent(event);
  }

  // Data Access Events
  async logDataEvent(
    action: 'create' | 'read' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    outcome: 'success' | 'failure' | 'error',
    userId?: string,
    details?: Record<string, any>,
    context?: {
      tenantId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const event: AuditEvent = {
      eventType: 'data_access',
      action: `data.${action}`,
      resourceType,
      resourceId,
      outcome,
      userId,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      ...context
    };

    await auditEventQueue.queueEvent(event);
  }

  // Security Events
  async logSecurityEvent(
    action: 'access_denied' | 'suspicious_activity' | 'breach_attempt',
    outcome: 'success' | 'failure' | 'error',
    details: Record<string, any>,
    context?: {
      userId?: string;
      tenantId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const event: AuditEvent = {
      eventType: 'security',
      action: `security.${action}`,
      outcome,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      ...context
    };

    await auditEventQueue.queueEvent(event);
  }
}

export const auditEventLoggers = AuditEventLoggers.getInstance();
