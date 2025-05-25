
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Shield } from 'lucide-react';

interface PasswordResetRateLimitNotificationProps {
  isLimited: boolean;
  remainingAttempts: number;
  nextAttemptAllowed: number;
}

export function PasswordResetRateLimitNotification({ 
  isLimited, 
  remainingAttempts,
  nextAttemptAllowed 
}: PasswordResetRateLimitNotificationProps) {
  if (!isLimited && remainingAttempts >= 3) return null;

  const formatTimeRemaining = (nextAllowed: number) => {
    const seconds = Math.ceil((nextAllowed - Date.now()) / 1000);
    if (seconds <= 0) return null;
    
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  };

  const timeRemaining = formatTimeRemaining(nextAttemptAllowed);

  if (isLimited && timeRemaining) {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          Too many password reset requests. Please wait {timeRemaining} before trying again.
        </AlertDescription>
      </Alert>
    );
  }

  if (remainingAttempts <= 1) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          ⚠️ {remainingAttempts} password reset attempt{remainingAttempts === 1 ? '' : 's'} remaining this hour
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
