
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { useErrorNotification } from '@/hooks/useErrorNotification';

interface PasswordResetFormProps {
  onBack?: () => void;
  resetToken?: string;
}

export function PasswordResetForm({ onBack, resetToken }: PasswordResetFormProps) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(!!resetToken);
  const [resetSent, setResetSent] = useState(false);
  const { resetPassword, updatePassword } = useAuth();
  const { showError, showSuccess } = useErrorNotification();

  const validatePasswordStrength = (password: string): boolean => {
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
      !isCommonPattern(password)
    ];
    
    return checks.filter(Boolean).length >= 5; // At least 5 out of 6 checks must pass
  };

  const isCommonPattern = (password: string): boolean => {
    const commonPatterns = [
      /123456/,
      /abcdef/,
      /qwerty/,
      /password/i,
      /(.)\1{2,}/ // repeated characters
    ];
    
    return commonPatterns.some(pattern => pattern.test(password));
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      showError('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setResetSent(true);
        showSuccess('Password reset instructions sent to your email');
      } else {
        showError(result.error || 'Failed to send reset email');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      showError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (!validatePasswordStrength(newPassword)) {
      showError('Password does not meet security requirements');
      return;
    }

    setIsLoading(true);

    try {
      const result = await updatePassword(newPassword);
      
      if (result.success) {
        showSuccess('Password updated successfully');
        onBack?.();
      } else {
        showError(result.error || 'Failed to update password');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSent) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Check Your Email
          </CardTitle>
          <CardDescription>
            We've sent password reset instructions to your email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please check your email for password reset instructions. The link will expire in 1 hour for security.
            </AlertDescription>
          </Alert>
          
          {onBack && (
            <Button 
              variant="outline" 
              onClick={onBack}
              className="w-full mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          {isResetMode ? 'Set New Password' : 'Reset Password'}
        </CardTitle>
        <CardDescription>
          {isResetMode 
            ? 'Enter your new password below'
            : 'Enter your email to receive reset instructions'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isResetMode ? (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <PasswordStrengthIndicator password={newPassword} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className={newPassword && confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''}
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600">Passwords do not match</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending instructions...
                </>
              ) : (
                'Send Reset Instructions'
              )}
            </Button>
          </form>
        )}
        
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
            className="w-full mt-4"
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
