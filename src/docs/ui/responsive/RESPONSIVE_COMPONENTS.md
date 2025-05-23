
# Responsive Component Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides implementation patterns for components that adapt effectively across different screen sizes.

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

## Related Documentation

- **[BREAKPOINT_STRATEGY.md](BREAKPOINT_STRATEGY.md)**: Breakpoint implementation and hooks
- **[RESPONSIVE_TYPOGRAPHY.md](RESPONSIVE_TYPOGRAPHY.md)**: Fluid typography systems
- **[PERFORMANCE_CONSIDERATIONS.md](PERFORMANCE_CONSIDERATIONS.md)**: Performance optimization

## Version History

- **1.0.0**: Extracted responsive components from main responsive design document (2025-05-23)
