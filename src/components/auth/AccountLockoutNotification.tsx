
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';

interface AccountLockoutNotificationProps {
  isLocked: boolean;
  lockoutEndTime?: number;
  onClose?: () => void;
}

export function AccountLockoutNotification({ 
  isLocked, 
  lockoutEndTime, 
  onClose 
}: AccountLockoutNotificationProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!isLocked || !lockoutEndTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = lockoutEndTime - now;

      if (remaining <= 0) {
        setTimeRemaining('');
        onClose?.();
        return;
      }

      const minutes = Math.ceil(remaining / (60 * 1000));
      setTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isLocked, lockoutEndTime, onClose]);

  if (!isLocked) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>
            Account temporarily locked due to multiple failed login attempts.
            {timeRemaining && ` Please try again in ${timeRemaining}.`}
          </span>
        </div>
        {onClose && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
            className="ml-2"
          >
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
