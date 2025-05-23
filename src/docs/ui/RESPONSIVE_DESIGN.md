
# Responsive Design Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides comprehensive guidelines for implementing responsive design patterns, breakpoint strategies, and mobile-first development approaches.

## Breakpoint Strategy

### Tailwind Breakpoint System

```typescript
// Breakpoint configuration
export const breakpoints = {
  sm: '640px',   // Small devices (landscape phones)
  md: '768px',   // Medium devices (tablets)
  lg: '1024px',  // Large devices (desktops)
  xl: '1280px',  // Extra large devices (large desktops)
  '2xl': '1536px' // 2X large devices (larger desktops)
} as const;

// Usage in components
const responsiveClasses = {
  container: "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6",
  text: "text-sm sm:text-base lg:text-lg",
  spacing: "p-4 sm:p-6 lg:p-8"
};
```

### Custom Breakpoint Hooks

```typescript
// Custom hooks for responsive behavior
import { useState, useEffect } from 'react';

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<string>('sm');
  
  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= 1536) setBreakpoint('2xl');
      else if (width >= 1280) setBreakpoint('xl');
      else if (width >= 1024) setBreakpoint('lg');
      else if (width >= 768) setBreakpoint('md');
      else if (width >= 640) setBreakpoint('sm');
      else setBreakpoint('xs');
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);
  
  return breakpoint;
}

export function useIsMobile() {
  const breakpoint = useBreakpoint();
  return ['xs', 'sm'].includes(breakpoint);
}

export function useIsTablet() {
  const breakpoint = useBreakpoint();
  return breakpoint === 'md';
}

export function useIsDesktop() {
  const breakpoint = useBreakpoint();
  return ['lg', 'xl', '2xl'].includes(breakpoint);
}
```

## Responsive Layout Components

### Responsive Grid System

```typescript
// Flexible grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, sm: 2, lg: 3, xl: 4 },
  gap = 4,
  className 
}: ResponsiveGridProps) {
  const gridClasses = cn(
    "grid",
    `grid-cols-${cols.default || 1}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,
    `gap-${gap}`,
    className
  );
  
  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

// Usage example
<ResponsiveGrid 
  cols={{ default: 1, sm: 2, lg: 3, xl: 4 }}
  gap={6}
>
  {items.map(item => (
    <Card key={item.id}>
      <CardContent>{item.content}</CardContent>
    </Card>
  ))}
</ResponsiveGrid>
```

### Responsive Container

```typescript
// Responsive container with proper constraints
interface ResponsiveContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function ResponsiveContainer({ 
  children, 
  size = 'lg', 
  className 
}: ResponsiveContainerProps) {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none'
  };
  
  return (
    <div className={cn(
      "w-full mx-auto px-4 sm:px-6 lg:px-8",
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  );
}
```

## Mobile-First Component Patterns

### Adaptive Navigation

```typescript
// Navigation that adapts to screen size
export function AdaptiveNavigation() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  if (isMobile) {
    return (
      <>
        <div className="flex items-center justify-between p-4">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64">
            <MobileNavMenu />
          </SheetContent>
        </Sheet>
      </>
    );
  }
  
  return (
    <nav className="flex items-center space-x-6 p-4">
      <Logo />
      <DesktopNavMenu />
    </nav>
  );
}
```

### Responsive Data Tables

```typescript
// Data table that adapts to mobile screens
interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  mobileBreakpoint?: string;
}

export function ResponsiveTable<T>({ 
  data, 
  columns, 
  mobileBreakpoint = 'md' 
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="space-y-4">
        {data.map((item, index) => (
          <Card key={index} className="p-4">
            <MobileRowRenderer item={item} columns={columns} />
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {/* Desktop table header */}
        </TableHeader>
        <TableBody>
          {/* Desktop table body */}
        </TableBody>
      </Table>
    </div>
  );
}

function MobileRowRenderer<T>({ item, columns }: { item: T; columns: ColumnDef<T>[] }) {
  return (
    <div className="space-y-2">
      {columns.map((column, index) => {
        const accessor = column.accessorKey as keyof T;
        return (
          <div key={index} className="flex justify-between">
            <span className="font-medium text-sm text-muted-foreground">
              {column.header as string}
            </span>
            <span className="text-sm">
              {String(item[accessor])}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

## Responsive Typography

### Fluid Typography System

```typescript
// Fluid typography utilities
export const fluidTypography = {
  'fluid-xs': 'text-xs sm:text-sm',
  'fluid-sm': 'text-sm sm:text-base',
  'fluid-base': 'text-base sm:text-lg',
  'fluid-lg': 'text-lg sm:text-xl',
  'fluid-xl': 'text-xl sm:text-2xl',
  'fluid-2xl': 'text-2xl sm:text-3xl lg:text-4xl',
  'fluid-3xl': 'text-3xl sm:text-4xl lg:text-5xl',
  'fluid-4xl': 'text-4xl sm:text-5xl lg:text-6xl'
} as const;

// Responsive heading component
interface ResponsiveHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveHeading({ 
  level, 
  children, 
  className 
}: ResponsiveHeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  const responsiveClasses = {
    1: 'text-3xl sm:text-4xl lg:text-5xl font-bold',
    2: 'text-2xl sm:text-3xl lg:text-4xl font-semibold',
    3: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
    4: 'text-lg sm:text-xl lg:text-2xl font-medium',
    5: 'text-base sm:text-lg font-medium',
    6: 'text-sm sm:text-base font-medium'
  };
  
  return (
    <Tag className={cn(responsiveClasses[level], className)}>
      {children}
    </Tag>
  );
}
```

## Performance Considerations

### Image Optimization

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

### Responsive Loading States

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

### Responsive Testing Utilities

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

- **[COMPONENT_ARCHITECTURE.md](COMPONENT_ARCHITECTURE.md)**: Component design patterns
- **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)**: Design system specifications
- **[ACCESSIBILITY.md](ACCESSIBILITY.md)**: Accessibility implementation
- **[PERFORMANCE.md](PERFORMANCE.md)**: Performance optimization
- **[../mobile/UI_UX.md](../mobile/UI_UX.md)**: Mobile-specific UI considerations

## Version History

- **1.0.0**: Initial responsive design implementation guidelines (2025-05-23)
