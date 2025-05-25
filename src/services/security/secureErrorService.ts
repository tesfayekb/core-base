
// Secure Error Service - Prevents Information Disclosure
// Integrates with Security Violation Logging

import { enhancedAuditService } from '../audit/enhancedAuditService';

export interface SecureErrorContext {
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  source: string;
  operation?: string;
}

export interface SecureErrorResponse {
  userMessage: string;
  errorCode: string;
  requestId: string;
  canRetry: boolean;
  supportContact?: boolean;
}

export enum SecurityErrorType {
  AUTHENTICATION_FAILED = 'auth_failed',
  PERMISSION_DENIED = 'permission_denied',
  INVALID_INPUT = 'invalid_input',
  RATE_LIMITED = 'rate_limited',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SYSTEM_ERROR = 'system_error'
}

export class SecureErrorService {
  private static instance: SecureErrorService;

  static getInstance(): SecureErrorService {
    if (!SecureErrorService.instance) {
      SecureErrorService.instance = new SecureErrorService();
    }
    return SecureErrorService.instance;
  }

  /**
   * Process security-related errors with secure messaging and logging
   */
  async handleSecurityError(
    error: Error,
    errorType: SecurityErrorType,
    context: SecureErrorContext,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<SecureErrorResponse> {
    // Generate unique request ID for tracking
    const requestId = context.requestId || this.generateRequestId();

    // Log detailed error for internal monitoring (with full context)
    await this.logSecurityViolation(error, errorType, context, severity, requestId);

    // Return sanitized user-friendly message
    return this.generateSecureResponse(errorType, requestId, severity);
  }

  /**
   * Log security violations with comprehensive audit trail
   */
  private async logSecurityViolation(
    error: Error,
    errorType: SecurityErrorType,
    context: SecureErrorContext,
    severity: string,
    requestId: string
  ): Promise<void> {
    try {
      // Prepare security violation details
      const violationDetails = {
        errorType,
        errorMessage: error.message,
        stackTrace: error.stack,
        requestId,
        severity,
        source: context.source,
        operation: context.operation,
        timestamp: new Date().toISOString()
      };

      // Log as security event with appropriate classification
      const auditAction = this.mapErrorTypeToAuditAction(errorType);
      const outcome = severity === 'critical' || severity === 'high' ? 'failure' : 'error';

      await enhancedAuditService.logSecurityEvent(
        auditAction,
        outcome,
        violationDetails,
        {
          userId: context.userId,
          tenantId: context.tenantId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        }
      );

      // Log additional context for critical errors
      if (severity === 'critical') {
        await enhancedAuditService.logSecurityEvent(
          'breach_attempt',
          'success',
          {
            ...violationDetails,
            alertLevel: 'CRITICAL',
            requiresInvestigation: true
          },
          {
            userId: context.userId,
            tenantId: context.tenantId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          }
        );
      }
    } catch (loggingError) {
      console.error('Failed to log security violation:', loggingError);
      // Don't throw - we still want to return a user response
    }
  }

  /**
   * Generate secure, user-friendly error responses that don't leak information
   */
  private generateSecureResponse(
    errorType: SecurityErrorType,
    requestId: string,
    severity: string
  ): SecureErrorResponse {
    const responses: Record<SecurityErrorType, SecureErrorResponse> = {
      [SecurityErrorType.AUTHENTICATION_FAILED]: {
        userMessage: 'Authentication failed. Please check your credentials and try again.',
        errorCode: 'AUTH_001',
        requestId,
        canRetry: true,
        supportContact: false
      },
      [SecurityErrorType.PERMISSION_DENIED]: {
        userMessage: 'You do not have permission to perform this action.',
        errorCode: 'PERM_001',
        requestId,
        canRetry: false,
        supportContact: true
      },
      [SecurityErrorType.INVALID_INPUT]: {
        userMessage: 'The provided information is invalid. Please check your input and try again.',
        errorCode: 'INPUT_001',
        requestId,
        canRetry: true,
        supportContact: false
      },
      [SecurityErrorType.RATE_LIMITED]: {
        userMessage: 'Too many requests. Please wait a moment before trying again.',
        errorCode: 'RATE_001',
        requestId,
        canRetry: true,
        supportContact: false
      },
      [SecurityErrorType.SUSPICIOUS_ACTIVITY]: {
        userMessage: 'Unusual activity detected. Your request has been blocked for security reasons.',
        errorCode: 'SEC_001',
        requestId,
        canRetry: false,
        supportContact: true
      },
      [SecurityErrorType.SYSTEM_ERROR]: {
        userMessage: 'A system error occurred. Please try again later.',
        errorCode: 'SYS_001',
        requestId,
        canRetry: true,
        supportContact: severity === 'critical'
      }
    };

    return responses[errorType];
  }

  /**
   * Map error types to audit actions
   */
  private mapErrorTypeToAuditAction(errorType: SecurityErrorType): 'access_denied' | 'suspicious_activity' | 'breach_attempt' {
    switch (errorType) {
      case SecurityErrorType.AUTHENTICATION_FAILED:
      case SecurityErrorType.PERMISSION_DENIED:
        return 'access_denied';
      case SecurityErrorType.RATE_LIMITED:
      case SecurityErrorType.INVALID_INPUT:
        return 'suspicious_activity';
      case SecurityErrorType.SUSPICIOUS_ACTIVITY:
      default:
        return 'breach_attempt';
    }
  }

  /**
   * Generate unique request ID for error tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if error indicates potential security threat
   */
  static isSecurityThreat(error: Error): boolean {
    const threatPatterns = [
      /injection/i,
      /xss/i,
      /script/i,
      /unauthorized/i,
      /forbidden/i,
      /csrf/i,
      /malicious/i
    ];

    return threatPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }
}

export const secureErrorService = SecureErrorService.getInstance();
