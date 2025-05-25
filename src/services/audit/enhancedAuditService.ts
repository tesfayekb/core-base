
// Enhanced Audit Service with Authentication and RBAC Integration
// Phase 1.5: Complete Audit Foundation Implementation

import { auditService } from '../database/auditService';

export interface AuditEvent {
  eventType: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  outcome: 'success' | 'failure' | 'error';
}

export class EnhancedAuditService {
  private static instance: EnhancedAuditService;
  private eventQueue: AuditEvent[] = [];
  private isProcessing = false;

  static getInstance(): EnhancedAuditService {
    if (!EnhancedAuditService.instance) {
      EnhancedAuditService.instance = new EnhancedAuditService();
    }
    return EnhancedAuditService.instance;
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

    await this.queueEvent(event);
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

    await this.queueEvent(event);
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

    await this.queueEvent(event);
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

    await this.queueEvent(event);
  }

  // Asynchronous event processing
  private async queueEvent(event: AuditEvent): Promise<void> {
    this.eventQueue.push(event);
    
    // Process queue asynchronously to minimize performance impact
    if (!this.isProcessing) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process events in batches for better performance
      const batchSize = 10;
      while (this.eventQueue.length > 0) {
        const batch = this.eventQueue.splice(0, batchSize);
        
        await Promise.all(
          batch.map(event => this.logEventToDatabase(event))
        );
      }
    } catch (error) {
      console.error('Error processing audit queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async logEventToDatabase(event: AuditEvent): Promise<void> {
    try {
      await auditService.logEvent(
        event.eventType,
        event.action,
        event.resourceType,
        event.resourceId,
        event.details || {},
        event.ipAddress,
        event.userAgent
      );
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // In production, you might want to store failed events for retry
    }
  }

  // Flush remaining events (useful for shutdown)
  async flush(): Promise<void> {
    if (this.eventQueue.length > 0) {
      await this.processQueue();
    }
  }
}

export const enhancedAuditService = EnhancedAuditService.getInstance();
