
import { useToast } from '@/hooks/use-toast';
import { errorService } from '@/services/ErrorService';
import { useCallback } from 'react';

export function useErrorNotification() {
  const { toast } = useToast();

  const notifyError = useCallback((error: Error | string, context?: Record<string, any>) => {
    const errorDetails = errorService.handleError(error, context);
    const actions = errorService.getRecoveryActions(errorDetails.code);

    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorDetails.userMessage,
      action: actions.length > 0 ? (
        <button
          onClick={actions[0].action}
          className="bg-destructive-foreground text-destructive px-3 py-1 rounded text-sm hover:bg-opacity-90"
        >
          {actions[0].label}
        </button>
      ) : undefined,
    });

    return errorDetails;
  }, [toast]);

  const notifySuccess = useCallback((message: string) => {
    toast({
      title: 'Success',
      description: message,
    });
  }, [toast]);

  const notifyInfo = useCallback((message: string) => {
    toast({
      title: 'Info',
      description: message,
    });
  }, [toast]);

  return {
    notifyError,
    notifySuccess,
    notifyInfo
  };
}
