
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Loader } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardSkeleton, TableSkeleton, ListSkeleton, FormSkeleton } from './skeleton-patterns';

export type LoadingSkeletonType = 'dashboard' | 'table' | 'list' | 'form' | 'custom';

interface LoadingWrapperProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  onRetry?: () => void;
  skeleton?: React.ReactNode;
  skeletonType?: LoadingSkeletonType;
  loadingText?: string;
  emptyState?: React.ReactNode;
  isEmpty?: boolean;
}

const getSkeletonByType = (type: LoadingSkeletonType) => {
  switch (type) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'table':
      return <TableSkeleton />;
    case 'list':
      return <ListSkeleton />;
    case 'form':
      return <FormSkeleton />;
    default:
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-32" />
        </div>
      );
  }
};

export function LoadingWrapper({ 
  loading, 
  error, 
  children, 
  onRetry,
  skeleton,
  skeletonType = 'custom',
  loadingText,
  emptyState,
  isEmpty = false
}: LoadingWrapperProps) {
  if (loading) {
    return (
      <div className="w-full">
        {loadingText && (
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin" />
            <span className="text-sm">{loadingText}</span>
          </div>
        )}
        {skeleton || getSkeletonByType(skeletonType)}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="ml-4"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  return <>{children}</>;
}

// Specialized loading components
export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center space-y-3">
        <Loader className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

export function InlineLoader({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  return <Loader className={`animate-spin ${sizeClasses[size]}`} />;
}
