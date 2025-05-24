
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { rateLimitService } from '@/services/auth/RateLimitService';
import { LoadingWrapper } from '@/components/ui/loading-wrapper';
import { AccountLockoutNotification } from './AccountLockoutNotification';
import { useErrorNotification } from '@/hooks/useErrorNotification';

interface LoginFormProps {
  onToggleMode?: () => void;
  onSuccess?: () => void;
}

export function LoginForm({ onToggleMode, onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);
  const { signIn, authError, clearAuthError } = useAuth();
  const { showError, showSuccess } = useErrorNotification();

  // Check rate limit status when email changes
  useEffect(() => {
    if (email) {
      const status = rateLimitService.checkRateLimit(email);
      setRateLimitStatus(status);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearAuthError();

    try {
      const result = await signIn(email, password);
      
      if (result.success) {
        showSuccess('Login successful!');
        onSuccess?.();
      } else if (result.error) {
        showError(result.error);
      }
    } catch (error) {
      showError('An unexpected error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Sign In
        </CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoadingWrapper 
          loading={false} 
          error={authError}
          onRetry={() => window.location.reload()}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <AccountLockoutNotification
              isLocked={rateLimitStatus?.isLocked}
              lockoutEndTime={rateLimitStatus?.lockoutEndTime}
              remainingAttempts={rateLimitStatus?.remainingAttempts}
            />
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !email || !password || rateLimitStatus?.isLocked}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            
            {onToggleMode && (
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  Sign up
                </button>
              </div>
            )}
          </form>
        </LoadingWrapper>
      </CardContent>
    </Card>
  );
}
