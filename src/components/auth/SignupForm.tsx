
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus } from 'lucide-react';
import { LoadingWrapper } from '@/components/ui/loading-wrapper';
import { useSignupForm } from '@/hooks/useSignupForm';
import { NameFields } from './NameFields';
import { PasswordFields } from './PasswordFields';

interface SignupFormProps {
  onToggleMode?: () => void;
  onSuccess?: () => void;
}

export function SignupForm({ onToggleMode, onSuccess }: SignupFormProps) {
  const {
    formData,
    isLoading,
    passwordMismatch,
    authError,
    isFormValid,
    handleInputChange,
    handleSubmit
  } = useSignupForm(onSuccess);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Create Account
        </CardTitle>
        <CardDescription>
          Sign up for a new account to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoadingWrapper 
          loading={false} 
          error={authError}
          onRetry={() => window.location.reload()}
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <NameFields
              firstName={formData.firstName}
              lastName={formData.lastName}
              onFirstNameChange={(value) => handleInputChange('firstName', value)}
              onLastNameChange={(value) => handleInputChange('lastName', value)}
              disabled={isLoading}
            />
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <PasswordFields
              password={formData.password}
              confirmPassword={formData.confirmPassword}
              onPasswordChange={(value) => handleInputChange('password', value)}
              onConfirmPasswordChange={(value) => handleInputChange('confirmPassword', value)}
              passwordMismatch={passwordMismatch}
              disabled={isLoading}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
            
            {onToggleMode && (
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </div>
            )}
          </form>
        </LoadingWrapper>
      </CardContent>
    </Card>
  );
}
