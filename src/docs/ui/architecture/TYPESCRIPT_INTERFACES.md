
# TypeScript Interface Design

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides guidelines for designing TypeScript interfaces for React components, focusing on type safety and developer experience.

## Props Interface Standards

```typescript
// ✅ Good: Well-designed props interface
interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  // Core functionality
  children: React.ReactNode;
  loading?: boolean;
  
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
  
  // Styling variants
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  // Event handlers with proper types
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  // Composition
  asChild?: boolean;
}
```

## Generic Component Interfaces

```typescript
// ✅ Good: Generic interfaces for reusable components
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function List<T>({ 
  items, 
  renderItem, 
  keyExtractor, 
  emptyState,
  loading,
  className 
}: ListProps<T>) {
  if (loading) {
    return <ListSkeleton />;
  }
  
  if (items.length === 0) {
    return emptyState || <EmptyState />;
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <div key={keyExtractor(item)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
```

## Related Documentation

- **[COMPOSITION_PATTERNS.md](COMPOSITION_PATTERNS.md)**: Component composition patterns
- **[STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)**: Component state management patterns
- **[INTEGRATION_PATTERNS.md](INTEGRATION_PATTERNS.md)**: System integration patterns

## Version History

- **1.0.0**: Extracted TypeScript interface patterns from main component architecture document (2025-05-23)
