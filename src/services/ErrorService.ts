
interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  context?: Record<string, any>;
}

interface ErrorAction {
  label: string;
  action: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline';
}

export class ErrorService {
  private static instance: ErrorService;

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  private constructor() {}

  handleError(error: Error | string, context?: Record<string, any>): ErrorDetails {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorDetails = this.classifyError(errorMessage, context);
    
    // Log error based on severity
    this.logError(errorDetails, error, context);
    
    return errorDetails;
  }

  private classifyError(message: string, context?: Record<string, any>): ErrorDetails {
    // Authentication errors
    if (message.includes('Invalid login credentials')) {
      return {
        code: 'AUTH_INVALID_CREDENTIALS',
        message,
        userMessage: 'Invalid email or password. Please try again.',
        severity: 'medium',
        recoverable: true,
        context
      };
    }

    if (message.includes('Email already registered')) {
      return {
        code: 'AUTH_EMAIL_EXISTS',
        message,
        userMessage: 'This email is already registered. Try signing in instead.',
        severity: 'low',
        recoverable: true,
        context
      };
    }

    if (message.includes('Password should be at least')) {
      return {
        code: 'AUTH_WEAK_PASSWORD',
        message,
        userMessage: 'Password must be at least 8 characters long with mixed case letters, numbers, and symbols.',
        severity: 'low',
        recoverable: true,
        context
      };
    }

    // Network errors
    if (message.includes('Network') || message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message,
        userMessage: 'Connection problem. Please check your internet and try again.',
        severity: 'high',
        recoverable: true,
        context
      };
    }

    // Permission errors
    if (message.includes('Permission denied') || message.includes('Unauthorized')) {
      return {
        code: 'PERMISSION_DENIED',
        message,
        userMessage: "You don't have permission to perform this action.",
        severity: 'medium',
        recoverable: false,
        context
      };
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return {
        code: 'RATE_LIMITED',
        message,
        userMessage: 'Too many attempts. Please wait a moment before trying again.',
        severity: 'medium',
        recoverable: true,
        context
      };
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message,
      userMessage: 'Something went wrong. Our team has been notified.',
      severity: 'high',
      recoverable: true,
      context
    };
  }

  private logError(details: ErrorDetails, originalError: Error | string, context?: Record<string, any>): void {
    const logData = {
      ...details,
      originalError: typeof originalError === 'string' ? originalError : originalError.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    if (details.severity === 'critical' || details.severity === 'high') {
      console.error('🚨 High severity error:', logData);
    } else {
      console.warn('⚠️ Error occurred:', logData);
    }
  }

  getRecoveryActions(errorCode: string): ErrorAction[] {
    switch (errorCode) {
      case 'AUTH_INVALID_CREDENTIALS':
        return [
          {
            label: 'Try Again',
            action: () => window.location.reload()
          },
          {
            label: 'Reset Password',
            action: () => {
              // This would navigate to password reset
              console.log('Navigate to password reset');
            },
            variant: 'outline'
          }
        ];

      case 'NETWORK_ERROR':
        return [
          {
            label: 'Retry',
            action: () => window.location.reload()
          }
        ];

      case 'RATE_LIMITED':
        return [
          {
            label: 'Wait and Retry',
            action: () => {
              setTimeout(() => window.location.reload(), 5000);
            }
          }
        ];

      default:
        return [
          {
            label: 'Try Again',
            action: () => window.location.reload()
          }
        ];
    }
  }
}

export const errorService = ErrorService.getInstance();
