
export interface AppError {
  type: 'auth' | 'network' | 'validation' | 'security' | 'system';
  message: string;
  code?: string;
  recoverable: boolean;
  retryAction?: () => void;
}

export class ErrorService {
  static categorizeError(error: any): AppError {
    // Authentication errors
    if (error.message?.includes('Invalid login credentials')) {
      return {
        type: 'auth',
        message: 'Invalid email or password. Please check your credentials and try again.',
        recoverable: true
      };
    }

    if (error.message?.includes('Account temporarily locked')) {
      return {
        type: 'security',
        message: error.message,
        recoverable: false
      };
    }

    if (error.message?.includes('Email not confirmed')) {
      return {
        type: 'auth',
        message: 'Please confirm your email address before signing in.',
        recoverable: true,
        retryAction: () => {
          // Could implement resend email logic
        }
      };
    }

    // Network errors
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'Connection issue. Please check your internet connection and try again.',
        recoverable: true
      };
    }

    // Validation errors
    if (error.message?.includes('Password must be')) {
      return {
        type: 'validation',
        message: error.message,
        recoverable: true
      };
    }

    // CSRF errors
    if (error.message?.includes('Security validation failed')) {
      return {
        type: 'security',
        message: 'Security check failed. Please refresh the page and try again.',
        recoverable: true,
        retryAction: () => window.location.reload()
      };
    }

    // Default system error
    return {
      type: 'system',
      message: 'An unexpected error occurred. Please try again.',
      recoverable: true
    };
  }

  static getRecoveryAction(error: AppError): string | null {
    switch (error.type) {
      case 'auth':
        return 'Try Again';
      case 'network':
        return 'Retry';
      case 'security':
        return error.retryAction ? 'Refresh Page' : null;
      case 'validation':
        return null; // Form should handle validation
      default:
        return 'Try Again';
    }
  }
}
