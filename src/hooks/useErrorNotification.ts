
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ErrorNotificationOptions {
  title?: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useErrorNotification() {
  const { toast } = useToast();

  const showError = (options: ErrorNotificationOptions) => {
    toast({
      variant: "destructive",
      title: options.title || "Error",
      description: options.description,
      action: options.action ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={options.action.onClick}
        >
          {options.action.label}
        </Button>
      ) : undefined,
    });
  };

  const showSuccess = (message: string) => {
    toast({
      title: "Success",
      description: message,
    });
  };

  const showInfo = (message: string) => {
    toast({
      title: "Information",
      description: message,
    });
  };

  return {
    showError,
    showSuccess,
    showInfo
  };
}
