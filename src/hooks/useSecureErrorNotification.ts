
// Secure Error Notification Hook
// Handles security-related error notifications without exposing sensitive information

import { useCallback } from 'react';
import { useEnhancedToast } from '@/components/ui/enhanced-toast';

export function useSecureErrorNotification() {
  const toast = useEnhancedToast();

  const handleSuspiciousActivity = useCallback(async (
    error: Error,
    activityType: string
  ) => {
    // Log the actual error for security monitoring (server-side)
    console.warn('🚨 Suspicious activity detected:', {
      type: activityType,
      timestamp: new Date().toISOString(),
      // Don't log sensitive error details to console in production
    });

    // Show user-friendly message without exposing security details
    toast.warning(
      'Security check failed. Please try again or contact support if the issue persists.',
      'Security Notice'
    );

    // In a production system, this would also:
    // - Log to security monitoring system
    // - Potentially trigger alerts
    // - Update user's security score/flags
  }, [toast]);

  const handlePermissionError = useCallback(async (
    error: Error,
    resource: string,
    action: string
  ) => {
    console.warn('🔒 Permission denied:', {
      resource,
      action,
      timestamp: new Date().toISOString(),
    });

    // User-friendly permission denied message
    toast.error(
      `You don't have permission to ${action} ${resource}. Please contact your administrator if you need access.`,
      'Access Denied'
    );
  }, [toast]);

  const handleValidationError = useCallback((
    message: string,
    field?: string
  ) => {
    const displayMessage = field 
      ? `${field}: ${message}`
      : message;

    toast.warning(displayMessage, 'Validation Error');
  }, [toast]);

  const handleSystemError = useCallback((
    error: Error,
    userMessage: string = 'A system error occurred. Please try again.'
  ) => {
    // Log error for debugging (but not sensitive data)
    console.error('System error:', {
      message: error.message,
      timestamp: new Date().toISOString(),
    });

    toast.error(userMessage, 'System Error');
  }, [toast]);

  return {
    handleSuspiciousActivity,
    handlePermissionError,
    handleValidationError,
    handleSystemError,
  };
}
