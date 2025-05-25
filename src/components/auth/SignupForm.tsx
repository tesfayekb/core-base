
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { LoadingWrapper } from '@/components/ui/loading-wrapper';
import { SignupFormFields } from './signup/SignupFormFields';
import { useSignupForm } from './signup/useSignupForm';

interface SignupFormProps {
  onToggleMode?: () => void;
  onSuccess?: () => void;
}

export function SignupForm({ onToggleMode, onSuccess }: SignupFormProps) {
  const { authError } = useAuth();
  const {
    formData,
    isLoading,
    passwordMismatch,
    isFormValid,
    handleInputChange,
    handleSubmit
  } = useSignupForm(onSuccess);

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <SignupFormFields
              formData={formData}
              passwordMismatch={passwordMismatch}
              isLoading={isLoading}
              onInputChange={handleInputChange}
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
