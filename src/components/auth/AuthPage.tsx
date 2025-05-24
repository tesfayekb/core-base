
import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { useAuth } from './AuthProvider';
import { Navigate } from 'react-router-dom';

export function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { isAuthenticated, loading } = useAuth();

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
    return <Navigate to="/dashboard" replace />;
  }

  const handleAuthSuccess = () => {
    // Navigation will be handled automatically by the auth state change
    console.log('Authentication successful');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
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
