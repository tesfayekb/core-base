
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

interface ErrorNotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export function useErrorNotification() {
  const { toast } = useToast();

  const showError = useCallback((error: string | Error, options?: ErrorNotificationOptions) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    toast({
      variant: 'destructive',
      title: options?.title || 'Error',
      description: options?.description || errorMessage,
      duration: options?.duration || 5000,
    });
  }, [toast]);

  const showSuccess = useCallback((message: string, options?: ErrorNotificationOptions) => {
    toast({
      title: options?.title || 'Success',
      description: options?.description || message,
      duration: options?.duration || 3000,
    });
  }, [toast]);

  const showWarning = useCallback((message: string, options?: ErrorNotificationOptions) => {
    toast({
      title: options?.title || 'Warning',
      description: options?.description || message,
      duration: options?.duration || 4000,
    });
  }, [toast]);

  return { showError, showSuccess, showWarning };
}
