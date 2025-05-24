
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Clock } from 'lucide-react';

interface AccountLockoutNotificationProps {
  isLocked: boolean;
  lockoutEndTime?: number;
  remainingAttempts?: number;
}

export function AccountLockoutNotification({ 
  isLocked, 
  lockoutEndTime, 
  remainingAttempts 
}: AccountLockoutNotificationProps) {
  if (!isLocked && !remainingAttempts) return null;

  const formatTimeRemaining = (endTime: number) => {
    const minutes = Math.ceil((endTime - Date.now()) / (60 * 1000));
    return minutes > 1 ? `${minutes} minutes` : '1 minute';
  };

  if (isLocked && lockoutEndTime) {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          Account temporarily locked. Please try again in {formatTimeRemaining(lockoutEndTime)}.
        </AlertDescription>
      </Alert>
    );
  }

  if (remainingAttempts && remainingAttempts <= 2) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          ⚠️ {remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'} remaining before temporary lockout
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
