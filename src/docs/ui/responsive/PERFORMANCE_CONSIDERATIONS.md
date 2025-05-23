
# Responsive Design Performance Considerations

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document outlines performance optimization strategies specific to responsive design implementation.

## Image Optimization

```typescript
// Responsive image component with optimization
interface ResponsiveImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

export function ResponsiveImage({ 
  src, 
  alt, 
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  className,
  priority = false 
}: ResponsiveImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      className={cn("w-full h-auto", className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
```

## Responsive Loading States

```typescript
// Loading states that adapt to screen size
export function ResponsiveLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Mobile layout */}
      <div className="block sm:hidden space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </Card>
        ))}
      </div>
      
      {/* Desktop layout */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Testing Responsive Design

```typescript
// Testing utilities for responsive behavior
export const testBreakpoints = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 }
};

// Helper for testing responsive components
export function withResponsiveProvider(
  Component: React.ComponentType,
  breakpoint: keyof typeof testBreakpoints = 'desktop'
) {
  return function ResponsiveTestComponent(props: any) {
    useEffect(() => {
      const { width, height } = testBreakpoints[breakpoint];
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height,
      });
      window.dispatchEvent(new Event('resize'));
    }, []);
    
    return <Component {...props} />;
  };
}
```

## Related Documentation

- **[BREAKPOINT_STRATEGY.md](BREAKPOINT_STRATEGY.md)**: Breakpoint implementation and hooks
- **[RESPONSIVE_COMPONENTS.md](RESPONSIVE_COMPONENTS.md)**: Responsive component patterns
- **[RESPONSIVE_TYPOGRAPHY.md](RESPONSIVE_TYPOGRAPHY.md)**: Fluid typography systems

## Version History

- **1.0.0**: Extracted performance considerations from main responsive design document (2025-05-23)
