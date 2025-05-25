
// Standardized Error Handling Service
// Provides consistent error handling patterns across all components

import { useEnhancedToast } from '@/components/ui/enhanced-toast';

export interface StandardError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

export interface ErrorHandlingOptions {
  showToast?: boolean;
  logError?: boolean;
  throwError?: boolean;
  fallbackValue?: any;
  retryable?: boolean;
}

export class StandardErrorHandler {
  private static instance: StandardErrorHandler;

  static getInstance(): StandardErrorHandler {
    if (!StandardErrorHandler.instance) {
      StandardErrorHandler.instance = new StandardErrorHandler();
    }
    return StandardErrorHandler.instance;
  }

  handleError(
    error: Error | string,
    context: string,
    options: ErrorHandlingOptions = {}
  ): StandardError {
    const standardError = this.createStandardError(error, context);
    
    // Log error if requested (default: true)
    if (options.logError !== false) {
      this.logError(standardError);
    }

    // Show user notification if requested (default: true for medium+ severity)
    if (options.showToast !== false && standardError.severity !== 'low') {
      this.showErrorToast(standardError);
    }

    // Throw error if requested
    if (options.throwError) {
      throw new Error(standardError.message);
    }

    return standardError;
  }

  private createStandardError(error: Error | string, context: string): StandardError {
    const message = typeof error === 'string' ? error : error.message;
    const severity = this.determineSeverity(message, context);
    const code = this.generateErrorCode(context, severity);

    return {
      code,
      message,
      userMessage: this.createUserFriendlyMessage(message, context),
      severity,
      context: { source: context },
      timestamp: new Date(),
      requestId: this.generateRequestId()
    };
  }

  private determineSeverity(message: string, context: string): 'low' | 'medium' | 'high' | 'critical' {
    if (context.includes('permission') || context.includes('auth')) {
      return 'high';
    }
    if (context.includes('database') || context.includes('cache')) {
      return 'medium';
    }
    if (message.toLowerCase().includes('critical') || message.toLowerCase().includes('security')) {
      return 'critical';
    }
    return 'low';
  }

  private generateErrorCode(context: string, severity: string): string {
    const contextCode = context.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4);
    const severityCode = severity.substring(0, 1).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${contextCode}_${severityCode}_${timestamp}`;
  }

  private createUserFriendlyMessage(message: string, context: string): string {
    const contextMessages = {
      permission: 'You do not have permission to perform this action.',
      authentication: 'Authentication failed. Please try logging in again.',
      cache: 'Data loading failed. Please try again.',
      database: 'Unable to save changes. Please try again.',
      validation: 'Please check your input and try again.',
      network: 'Connection issue. Please check your internet connection.'
    };

    for (const [key, userMessage] of Object.entries(contextMessages)) {
      if (context.toLowerCase().includes(key)) {
        return userMessage;
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }

  private logError(error: StandardError): void {
    const logLevel = this.getLogLevel(error.severity);
    console[logLevel](`[${error.code}] ${error.context?.source}: ${error.message}`, {
      timestamp: error.timestamp,
      severity: error.severity,
      requestId: error.requestId,
      context: error.context
    });
  }

  private getLogLevel(severity: string): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      default:
        return 'log';
    }
  }

  private showErrorToast(error: StandardError): void {
    // This would be called from components that have access to toast
    // We'll provide a helper hook for this
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for common error scenarios
  handlePermissionError(resource: string, action: string): StandardError {
    return this.handleError(
      `Permission denied for ${action} on ${resource}`,
      'permission',
      { showToast: true }
    );
  }

  handleValidationError(field: string, reason: string): StandardError {
    return this.handleError(
      `Validation failed for ${field}: ${reason}`,
      'validation',
      { showToast: true, severity: 'medium' }
    );
  }

  handleNetworkError(operation: string): StandardError {
    return this.handleError(
      `Network error during ${operation}`,
      'network',
      { showToast: true, retryable: true }
    );
  }
}

export const standardErrorHandler = StandardErrorHandler.getInstance();
