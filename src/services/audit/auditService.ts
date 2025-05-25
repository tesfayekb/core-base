interface AuditEvent {
  id: string;
  timestamp: string;
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'success' | 'failure' | 'error';
  errorMessage?: string;
}

interface AuditContext {
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  private static instance: AuditService;
  private context: AuditContext = {};

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  private constructor() {
    // Initialize with browser context
    this.context.userAgent = navigator.userAgent;
  }

  setContext(context: Partial<AuditContext>): void {
    this.context = { ...this.context, ...context };
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async logEvent(
    action: string,
    resource: string,
    outcome: 'success' | 'failure' | 'error',
    details?: {
      resourceId?: string;
      additionalData?: Record<string, any>;
      errorMessage?: string;
    }
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      userId: this.context.userId,
      tenantId: this.context.tenantId,
      action,
      resource,
      resourceId: details?.resourceId,
      details: details?.additionalData,
      ipAddress: this.context.ipAddress,
      userAgent: this.context.userAgent,
      outcome,
      errorMessage: details?.errorMessage
    };

    // Log to console for development
    console.log('🔍 Audit Event:', event);

    // In production, this would send to a logging service
    try {
      // Store in localStorage for development purposes
      const existingLogs = localStorage.getItem('audit_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(event);
      
      // Keep only last 100 events in localStorage
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('audit_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store audit log:', error);
    }
  }

  // Convenience methods for common events
  async logAuthentication(outcome: 'success' | 'failure', email?: string, errorMessage?: string): Promise<void> {
    await this.logEvent('login', 'user', outcome, {
      additionalData: { email },
      errorMessage
    });
  }

  async logPermissionCheck(
    action: string,
    resource: string,
    outcome: 'success' | 'failure',
    resourceId?: string
  ): Promise<void> {
    await this.logEvent('permission_check', 'permission', outcome, {
      resourceId,
      additionalData: { checkedAction: action, checkedResource: resource }
    });
  }

  async logRoleAssignment(
    targetUserId: string,
    roleId: string,
    outcome: 'success' | 'failure',
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent('role_assignment', 'user', outcome, {
      resourceId: targetUserId,
      additionalData: { roleId },
      errorMessage
    });
  }

  async logSecurityViolation(
    violationType: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.logEvent('security_violation', 'security', 'error', {
      additionalData: { violationType, ...details }
    });
  }

  // Get audit logs (for development/testing)
  getAuditLogs(): AuditEvent[] {
    try {
      const logs = localStorage.getItem('audit_logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  // Clear audit logs (for development/testing)
  clearAuditLogs(): void {
    localStorage.removeItem('audit_logs');
  }
}

export const auditService = AuditService.getInstance();
