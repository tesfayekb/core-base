
// React Hook for Standardized Error Handling

import { useCallback } from 'react';
import { useEnhancedToast } from '@/components/ui/enhanced-toast';
import { standardErrorHandler, StandardError, ErrorHandlingOptions } from '@/services/error/standardErrorHandler';

export function useStandardErrorHandler() {
  const toast = useEnhancedToast();

  const handleError = useCallback((
    error: Error | string,
    context: string,
    options: ErrorHandlingOptions = {}
  ): StandardError => {
    const standardError = standardErrorHandler.handleError(error, context, {
      ...options,
      showToast: false // We'll handle toast here
    });

    // Show toast notification if requested
    if (options.showToast !== false && standardError.severity !== 'low') {
      const toastType = standardError.severity === 'critical' || standardError.severity === 'high' 
        ? 'error' 
        : 'warning';
      
      toast[toastType](standardError.userMessage, `Error ${standardError.code}`);
    }

    return standardError;
  }, [toast]);

  const handlePermissionError = useCallback((resource: string, action: string) => {
    return handleError(
      `Permission denied for ${action} on ${resource}`,
      'permission',
      { showToast: true }
    );
  }, [handleError]);

  const handleValidationError = useCallback((field: string, reason: string) => {
    return handleError(
      `Validation failed for ${field}: ${reason}`,
      'validation',
      { showToast: true }
    );
  }, [handleError]);

  const handleNetworkError = useCallback((operation: string) => {
    return handleError(
      `Network error during ${operation}`,
      'network',
      { showToast: true }
    );
  }, [handleError]);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    options: ErrorHandlingOptions & { fallbackValue?: T } = {}
  ): Promise<T | undefined> => {
    try {
      return await operation();
    } catch (error) {
      const standardError = handleError(error as Error, context, options);
      
      if (options.fallbackValue !== undefined) {
        return options.fallbackValue;
      }
      
      if (options.throwError) {
        throw standardError;
      }
      
      return undefined;
    }
  }, [handleError]);

  return {
    handleError,
    handlePermissionError,
    handleValidationError,
    handleNetworkError,
    handleAsyncOperation
  };
}
