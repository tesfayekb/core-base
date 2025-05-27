import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { useAuth } from './AuthProvider';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { isAuthenticated, loading } = useAuth();
  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleAuthSuccess = () => {
    // Navigation will be handled automatically by the auth state change
    console.log('Authentication successful');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        {!isSupabaseConfigured && (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Mode:</strong> Supabase is not configured. 
              <div className="mt-2">
                <p className="font-medium">Use these demo credentials:</p>
                <div className="mt-1 text-sm bg-muted p-2 rounded">
                  Email: <code>demo@example.com</code><br />
                  Password: <code>demo123</code>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                To enable real authentication:
                <ol className="mt-1 list-decimal list-inside space-y-1">
                  <li>Create a <code className="bg-muted px-1 py-0.5 rounded">.env</code> file</li>
                  <li>Add your Supabase credentials</li>
                  <li>Restart the development server</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {isLoginMode ? (
          <LoginForm
            onToggleMode={() => setIsLoginMode(false)}
            onSuccess={handleAuthSuccess}
          />
        ) : (
          <SignupForm
            onToggleMode={() => setIsLoginMode(true)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </div>
    </div>
  );
}
