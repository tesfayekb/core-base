
# Loading States and Skeleton Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides implementation examples for loading states, skeletons, and error handling patterns.

## Comprehensive Loading States

```typescript
// Loading state components
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-6 w-24 mb-4" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
      
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Loading wrapper component
interface LoadingWrapperProps {
  loading: boolean;
  error?: Error | null;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function LoadingWrapper({
  loading,
  error,
  children,
  skeleton,
  errorFallback
}: LoadingWrapperProps) {
  if (loading) {
    return <>{skeleton || <PageSkeleton />}</>;
  }
  
  if (error) {
    return (
      <>
        {errorFallback || (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">Something went wrong</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        )}
      </>
    );
  }
  
  return <>{children}</>;
}
```

## Related Documentation

- **[FORM_EXAMPLES.md](FORM_EXAMPLES.md)**: Form implementation examples
- **[TABLE_EXAMPLES.md](TABLE_EXAMPLES.md)**: Data table implementation examples
- **[MODAL_EXAMPLES.md](MODAL_EXAMPLES.md)**: Modal and dialog examples

## Version History

- **1.0.0**: Extracted loading examples from main implementation examples document (2025-05-23)
