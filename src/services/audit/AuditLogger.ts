
// Audit Logger Service
// Phase 2.4.2: Role Management Integration

export interface AuditEvent {
  eventType: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  userId?: string;
  tenantId?: string;
}

export class AuditLogger {
  private static instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async logEvent(event: AuditEvent): Promise<void> {
    try {
      // For now, we'll log to console. In a full implementation,
      // this would integrate with the audit logging system
      console.log('Audit Event:', {
        timestamp: new Date().toISOString(),
        ...event
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  async logUserAction(
    action: string,
    userId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      eventType: 'user_action',
      action,
      resourceType: 'user',
      resourceId: userId,
      details,
      userId
    });
  }

  async logRoleAssignment(
    userId: string,
    roleId: string,
    assignedBy: string,
    tenantId?: string
  ): Promise<void> {
    await this.logEvent({
      eventType: 'role_assignment',
      action: 'assign_role',
      resourceType: 'user_role',
      resourceId: userId,
      details: {
        roleId,
        assignedBy,
        tenantId
      },
      userId: assignedBy,
      tenantId
    });
  }
}

export const auditLogger = AuditLogger.getInstance();
