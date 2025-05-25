
// Secure Error Notification Hook
// Provides user-friendly error presentation for security events

import { useCallback } from 'react';
import { useErrorNotification } from './useErrorNotification';
import { useAuth } from '@/contexts/AuthContext';
import { secureErrorService, SecurityErrorType, SecureErrorContext } from '@/services/security/secureErrorService';

export function useSecureErrorNotification() {
  const { showError, showWarning, showSuccess } = useErrorNotification();
  const { user, tenantId } = useAuth();

  const handleSecurityError = useCallback(async (
    error: Error,
    errorType: SecurityErrorType,
    context: Partial<SecureErrorContext> = {}
  ) => {
    // Build complete context
    const fullContext: SecureErrorContext = {
      userId: user?.id,
      tenantId: tenantId || undefined,
      requestId: context.requestId || `req_${Date.now()}`,
      source: context.source || 'ui',
      operation: context.operation,
      ipAddress: context.ipAddress,
      userAgent: navigator?.userAgent
    };

    // Determine severity based on error type and content
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    
    if (secureErrorService.constructor.isSecurityThreat(error)) {
      severity = 'high';
    }
    
    if (errorType === SecurityErrorType.SUSPICIOUS_ACTIVITY) {
      severity = 'critical';
    }

    try {
      // Process error through secure error service
      const secureResponse = await secureErrorService.handleSecurityError(
        error,
        errorType,
        fullContext,
        severity
      );

      // Display appropriate user message based on severity
      if (severity === 'critical' || severity === 'high') {
        showError(secureResponse.userMessage, {
          title: 'Security Alert',
          description: secureResponse.supportContact 
            ? `Request ID: ${secureResponse.requestId}. Please contact support if this persists.`
            : `Request ID: ${secureResponse.requestId}`,
          duration: 8000
        });
      } else if (severity === 'medium') {
        showWarning(secureResponse.userMessage, {
          title: 'Access Issue',
          description: secureResponse.canRetry 
            ? 'You can try again or contact support if the issue persists.'
            : `Request ID: ${secureResponse.requestId}`,
          duration: 6000
        });
      } else {
        showError(secureResponse.userMessage, {
          title: 'Error',
          duration: 4000
        });
      }

      return secureResponse;
    } catch (processingError) {
      console.error('Failed to process security error:', processingError);
      
      // Fallback to generic error message
      showError('An error occurred. Please try again later.', {
        title: 'System Error',
        duration: 5000
      });
    }
  }, [user?.id, tenantId, showError, showWarning]);

  const handleAuthenticationError = useCallback((error: Error, context?: Partial<SecureErrorContext>) => {
    return handleSecurityError(error, SecurityErrorType.AUTHENTICATION_FAILED, {
      ...context,
      source: 'authentication'
    });
  }, [handleSecurityError]);

  const handlePermissionError = useCallback((error: Error, resource: string, action: string) => {
    return handleSecurityError(error, SecurityErrorType.PERMISSION_DENIED, {
      source: 'authorization',
      operation: `${action}:${resource}`
    });
  }, [handleSecurityError]);

  const handleInputValidationError = useCallback((error: Error, fieldName?: string) => {
    return handleSecurityError(error, SecurityErrorType.INVALID_INPUT, {
      source: 'form_validation',
      operation: fieldName ? `validate:${fieldName}` : 'validate'
    });
  }, [handleSecurityError]);

  const handleRateLimitError = useCallback((error: Error, endpoint?: string) => {
    return handleSecurityError(error, SecurityErrorType.RATE_LIMITED, {
      source: 'rate_limiting',
      operation: endpoint ? `api:${endpoint}` : 'api_call'
    });
  }, [handleSecurityError]);

  const handleSuspiciousActivity = useCallback((error: Error, details?: string) => {
    return handleSecurityError(error, SecurityErrorType.SUSPICIOUS_ACTIVITY, {
      source: 'security_monitor',
      operation: details || 'anomaly_detection'
    });
  }, [handleSecurityError]);

  return {
    handleSecurityError,
    handleAuthenticationError,
    handlePermissionError,
    handleInputValidationError,
    handleRateLimitError,
    handleSuspiciousActivity
  };
}
