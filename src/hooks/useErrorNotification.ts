
import { useCallback } from 'react';
import { useStandardErrorHandler } from './useStandardErrorHandler';

interface ErrorNotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  showToast?: boolean;
}

export function useErrorNotification() {
  const { handleError } = useStandardErrorHandler();

  const showError = useCallback((error: string | Error, options?: ErrorNotificationOptions) => {
    handleError(error, 'user_notification', {
      showToast: options?.showToast !== false
    });
  }, [handleError]);

  const showSuccess = useCallback((message: string, options?: ErrorNotificationOptions) => {
    // Success notifications can still use the enhanced toast directly
    console.log('Success:', message);
  }, []);

  const showWarning = useCallback((message: string, options?: ErrorNotificationOptions) => {
    handleError(message, 'user_warning', {
      showToast: options?.showToast !== false
    });
  }, [handleError]);

  return { showError, showSuccess, showWarning };
}
