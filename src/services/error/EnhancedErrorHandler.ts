
// Enhanced Error Handler - Cross-System Error Propagation
// Addresses inconsistencies in error handling across security integration points

import { standardizedAuditLogger } from '../audit/StandardizedAuditLogger';

export interface SystemError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: Record<string, any>;
  correlationId?: string;
  timestamp: string;
  source: string;
  userId?: string;
  tenantId?: string;
}

export interface ErrorPropagationRule {
  sourceSystem: string;
  targetSystems: string[];
  errorTypes: string[];
  propagationLevel: 'immediate' | 'batched' | 'silent';
}

export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private errorBuffer = new Map<string, SystemError[]>();
  private propagationRules: ErrorPropagationRule[] = [
    {
      sourceSystem: 'security',
      targetSystems: ['audit', 'rbac', 'tenant'],
      errorTypes: ['threat_detection', 'access_denied'],
      propagationLevel: 'immediate'
    },
    {
      sourceSystem: 'rbac',
      targetSystems: ['audit', 'security'],
      errorTypes: ['permission_denied', 'role_assignment_failed'],
      propagationLevel: 'immediate'
    },
    {
      sourceSystem: 'tenant',
      targetSystems: ['audit', 'security', 'rbac'],
      errorTypes: ['isolation_breach', 'resource_limit_exceeded'],
      propagationLevel: 'immediate'
    },
    {
      sourceSystem: 'audit',
      targetSystems: ['security'],
      errorTypes: ['logging_failure', 'storage_error'],
      propagationLevel: 'batched'
    }
  ];

  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  async handleSystemError(
    error: Error | string,
    source: string,
    context: Record<string, any> = {},
    correlationId?: string
  ): Promise<SystemError> {
    const systemError: SystemError = {
      code: this.generateErrorCode(source, error),
      message: typeof error === 'string' ? error : error.message,
      severity: this.determineSeverity(error, source, context),
      context: {
        ...context,
        stack: typeof error === 'object' ? error.stack : undefined
      },
      correlationId: correlationId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source,
      userId: context.userId,
      tenantId: context.tenantId
    };

    // Log the error
    await this.logSystemError(systemError);

    // Propagate to other systems
    await this.propagateError(systemError);

    return systemError;
  }

  async handleSecurityError(
    error: Error | string,
    securityContext: {
      userId?: string;
      tenantId?: string;
      action?: string;
      resource?: string;
      correlationId?: string;
    }
  ): Promise<SystemError> {
    return this.handleSystemError(
      error,
      'security',
      {
        action: securityContext.action,
        resource: securityContext.resource,
        userId: securityContext.userId,
        tenantId: securityContext.tenantId,
        securityEvent: true
      },
      securityContext.correlationId
    );
  }

  async handleRBACError(
    error: Error | string,
    rbacContext: {
      userId?: string;
      tenantId?: string;
      permission?: string;
      resource?: string;
      correlationId?: string;
    }
  ): Promise<SystemError> {
    return this.handleSystemError(
      error,
      'rbac',
      {
        permission: rbacContext.permission,
        resource: rbacContext.resource,
        userId: rbacContext.userId,
        tenantId: rbacContext.tenantId,
        rbacEvent: true
      },
      rbacContext.correlationId
    );
  }

  async handleTenantError(
    error: Error | string,
    tenantContext: {
      tenantId?: string;
      operation?: string;
      resource?: string;
      correlationId?: string;
    }
  ): Promise<SystemError> {
    return this.handleSystemError(
      error,
      'tenant',
      {
        operation: tenantContext.operation,
        resource: tenantContext.resource,
        tenantId: tenantContext.tenantId,
        tenantEvent: true
      },
      tenantContext.correlationId
    );
  }

  async handleAuditError(
    error: Error | string,
    auditContext: {
      userId?: string;
      tenantId?: string;
      eventType?: string;
      correlationId?: string;
    }
  ): Promise<SystemError> {
    return this.handleSystemError(
      error,
      'audit',
      {
        eventType: auditContext.eventType,
        userId: auditContext.userId,
        tenantId: auditContext.tenantId,
        auditEvent: true
      },
      auditContext.correlationId
    );
  }

  private async propagateError(systemError: SystemError): Promise<void> {
    try {
      const applicableRules = this.propagationRules.filter(rule => 
        rule.sourceSystem === systemError.source &&
        (rule.errorTypes.length === 0 || rule.errorTypes.some(type => systemError.code.includes(type)))
      );

      for (const rule of applicableRules) {
        if (rule.propagationLevel === 'immediate') {
          await this.immediatePropagate(systemError, rule.targetSystems);
        } else if (rule.propagationLevel === 'batched') {
          this.batchPropagate(systemError, rule.targetSystems);
        }
        // 'silent' errors are not propagated
      }
    } catch (error) {
      console.error('Error in error propagation:', error);
    }
  }

  private async immediatePropagate(systemError: SystemError, targetSystems: string[]): Promise<void> {
    const propagationTasks = targetSystems.map(async (targetSystem) => {
      try {
        await standardizedAuditLogger.logSecurityEvent(
          `error_propagation.${targetSystem}`,
          systemError.severity,
          {
            originalError: systemError.code,
            originalSource: systemError.source,
            propagatedTo: targetSystem,
            correlationId: systemError.correlationId,
            outcome: 'success'
          },
          {
            userId: systemError.userId,
            tenantId: systemError.tenantId
          }
        );
      } catch (error) {
        console.error(`Failed to propagate error to ${targetSystem}:`, error);
      }
    });

    await Promise.allSettled(propagationTasks);
  }

  private batchPropagate(systemError: SystemError, targetSystems: string[]): void {
    for (const targetSystem of targetSystems) {
      if (!this.errorBuffer.has(targetSystem)) {
        this.errorBuffer.set(targetSystem, []);
      }
      
      const buffer = this.errorBuffer.get(targetSystem)!;
      buffer.push(systemError);

      // Limit buffer size
      if (buffer.length > 100) {
        buffer.splice(0, buffer.length - 100);
      }
    }
  }

  async flushErrorBuffer(): Promise<void> {
    try {
      for (const [targetSystem, errors] of this.errorBuffer.entries()) {
        if (errors.length === 0) continue;

        await standardizedAuditLogger.logSecurityEvent(
          `error_batch.${targetSystem}`,
          'medium',
          {
            batchSize: errors.length,
            errors: errors.map(e => ({
              code: e.code,
              source: e.source,
              correlationId: e.correlationId
            })),
            outcome: 'success'
          },
          {}
        );

        // Clear the buffer
        this.errorBuffer.set(targetSystem, []);
      }
    } catch (error) {
      console.error('Error flushing error buffer:', error);
    }
  }

  private async logSystemError(systemError: SystemError): Promise<void> {
    try {
      await standardizedAuditLogger.logSecurityEvent(
        `system_error.${systemError.source}`,
        systemError.severity,
        {
          errorCode: systemError.code,
          errorMessage: systemError.message,
          context: systemError.context,
          correlationId: systemError.correlationId,
          outcome: 'error'
        },
        {
          userId: systemError.userId,
          tenantId: systemError.tenantId
        }
      );
    } catch (error) {
      console.error('Failed to log system error:', error);
    }
  }

  private generateErrorCode(source: string, error: Error | string): string {
    const errorType = typeof error === 'string' ? 'GENERIC' : error.constructor.name.toUpperCase();
    const timestamp = Date.now().toString(36);
    return `${source.toUpperCase()}_${errorType}_${timestamp}`;
  }

  private determineSeverity(error: Error | string, source: string, context: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // Critical errors
    if (
      errorMessage.includes('security') ||
      errorMessage.includes('breach') ||
      errorMessage.includes('unauthorized') ||
      context.securityEvent
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('access') ||
      errorMessage.includes('tenant') ||
      source === 'security' ||
      source === 'rbac'
    ) {
      return 'high';
    }

    // Medium severity
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('database') ||
      source === 'audit'
    ) {
      return 'medium';
    }

    return 'low';
  }

  getErrorStatistics(): {
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    errorsBySource: Record<string, number>;
    bufferedErrors: number;
  } {
    // This would typically query stored error data
    // For now, return buffer statistics
    const bufferedErrors = Array.from(this.errorBuffer.values()).reduce((sum, errors) => sum + errors.length, 0);
    
    return {
      totalErrors: 0, // Would be from persistent storage
      errorsBySeverity: {},
      errorsBySource: {},
      bufferedErrors
    };
  }
}

export const enhancedErrorHandler = EnhancedErrorHandler.getInstance();
