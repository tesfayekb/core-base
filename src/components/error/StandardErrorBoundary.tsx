
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { standardErrorHandler } from '@/services/error/standardErrorHandler';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  standardError?: any;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  context?: string;
}

export class StandardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context = this.props.context || 'component_boundary';
    
    // Use standardized error handling
    const standardError = standardErrorHandler.handleError(
      error,
      context,
      { 
        showToast: false, // Don't show toast for boundary errors
        logError: true 
      }
    );
    
    this.setState({ 
      errorInfo,
      standardError 
    });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { standardError } = this.state;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {standardError?.userMessage || 'An unexpected error occurred. You can try refreshing the page or contact support if the problem persists.'}
              </p>
              
              {this.props.showDetails && standardError && (
                <details className="text-xs bg-muted p-3 rounded">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>Error Code:</strong> {standardError.code}
                    </div>
                    <div>
                      <strong>Severity:</strong> {standardError.severity}
                    </div>
                    <div>
                      <strong>Time:</strong> {standardError.timestamp.toLocaleString()}
                    </div>
                    {standardError.requestId && (
                      <div>
                        <strong>Request ID:</strong> {standardError.requestId}
                      </div>
                    )}
                  </div>
                </details>
              )}
              
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={this.handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button size="sm" onClick={this.handleReload}>
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier usage
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  context?: string;
}

export function StandardErrorBoundaryWrapper({ 
  children, 
  fallback, 
  showDetails,
  context 
}: ErrorBoundaryWrapperProps) {
  return (
    <StandardErrorBoundary 
      fallback={fallback} 
      showDetails={showDetails}
      context={context}
    >
      {children}
    </StandardErrorBoundary>
  );
}
