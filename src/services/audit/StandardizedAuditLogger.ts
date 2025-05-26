
// Standardized Audit Logger - Phase 2.3 Implementation
// Implements LOG_FORMAT_STANDARDIZATION.md requirements

import { enhancedAuditService } from './enhancedAuditService';

export interface StandardizedAuditLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  source: string;
  context?: {
    requestId?: string;
    sessionId?: string;
    tenantId?: string;
    userId?: string;
    traceId?: string;
  };
  data?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string | number;
  };
}

export interface AuditLogEntry extends StandardizedAuditLog {
  audit: {
    action: string;
    outcome: 'success' | 'failure' | 'error';
    resource: {
      type: string;
      id: string;
    };
    changes?: {
      before: any;
      after: any;
    };
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    };
  };
}

export class StandardizedAuditLogger {
  private static instance: StandardizedAuditLogger;
  private correlationMap = new Map<string, string>();

  static getInstance(): StandardizedAuditLogger {
    if (!StandardizedAuditLogger.instance) {
      StandardizedAuditLogger.instance = new StandardizedAuditLogger();
    }
    return StandardizedAuditLogger.instance;
  }

  async logStandardizedEvent(
    action: string,
    resourceType: string,
    resourceId: string,
    outcome: 'success' | 'failure' | 'error',
    context: {
      userId?: string;
      tenantId?: string;
      requestId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
    changes?: { before: any; after: any },
    additionalData?: Record<string, any>
  ): Promise<void> {
    const traceId = this.generateTraceId();
    
    if (context.requestId) {
      this.correlationMap.set(context.requestId, traceId);
    }

    const auditLog: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level: outcome === 'error' ? 'error' : 'info',
      message: `${action} performed on ${resourceType}`,
      source: 'audit-service',
      context: {
        requestId: context.requestId,
        sessionId: context.sessionId,
        tenantId: context.tenantId,
        userId: context.userId,
        traceId
      },
      data: additionalData,
      audit: {
        action,
        outcome,
        resource: {
          type: resourceType,
          id: resourceId
        },
        changes,
        metadata: {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        }
      }
    };

    // Store in enhanced audit service
    await enhancedAuditService.logDataEvent(
      this.mapActionToDataAction(action),
      resourceType,
      resourceId,
      outcome,
      context.userId,
      {
        standardizedLog: auditLog,
        traceId,
        changes
      },
      {
        tenantId: context.tenantId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    );
  }

  async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
    context: {
      userId?: string;
      tenantId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const level = this.mapSeverityToLevel(severity);
    
    await this.logStandardizedEvent(
      `security.${eventType}`,
      'security_event',
      this.generateEventId(),
      details.outcome || 'success',
      context,
      undefined,
      { severity, ...details }
    );
  }

  getCorrelatedEvents(requestId: string): string | undefined {
    return this.correlationMap.get(requestId);
  }

  private generateTraceId(): string {
    return `trace-${crypto.randomUUID()}`;
  }

  private generateEventId(): string {
    return crypto.randomUUID();
  }

  private mapActionToDataAction(action: string): 'create' | 'read' | 'update' | 'delete' {
    if (action.includes('create') || action.includes('add')) return 'create';
    if (action.includes('update') || action.includes('modify')) return 'update';
    if (action.includes('delete') || action.includes('remove')) return 'delete';
    return 'read';
  }

  private mapSeverityToLevel(severity: string): 'debug' | 'info' | 'warn' | 'error' | 'critical' {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warn';
      case 'high': return 'error';
      case 'critical': return 'critical';
      default: return 'info';
    }
  }
}

export const standardizedAuditLogger = StandardizedAuditLogger.getInstance();
