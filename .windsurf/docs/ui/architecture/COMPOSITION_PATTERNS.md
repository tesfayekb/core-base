
# Component Composition Patterns

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides detailed guidelines for component composition patterns, focusing on reusable and maintainable component design.

## Composition over Inheritance

Components should be designed for composition rather than inheritance:

```typescript
// ✅ Good: Composable component design
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  className?: string;
}

export function Card({ children, variant = 'default', className, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

// Usage with composition
<Card variant="elevated">
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  <CardContent>
    <UserProfile user={user} />
  </CardContent>
</Card>
```

## Compound Components Pattern

For complex components with multiple related parts:

```typescript
// ✅ Good: Compound component pattern
interface DataTableProps {
  data: any[];
  children: React.ReactNode;
}

function DataTable({ data, children }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filtering, setFiltering] = useState<ColumnFiltersState>([]);
  
  const contextValue = useMemo(() => ({
    data,
    sorting,
    setSorting,
    filtering,
    setFiltering
  }), [data, sorting, filtering]);
  
  return (
    <DataTableContext.Provider value={contextValue}>
      <div className="data-table">
        {children}
      </div>
    </DataTableContext.Provider>
  );
}

// Sub-components
DataTable.Header = DataTableHeader;
DataTable.Body = DataTableBody;
DataTable.Pagination = DataTablePagination;

// Usage
<DataTable data={users}>
  <DataTable.Header />
  <DataTable.Body />
  <DataTable.Pagination />
</DataTable>
```

## Related Documentation

- **[TYPESCRIPT_INTERFACES.md](TYPESCRIPT_INTERFACES.md)**: TypeScript interface design patterns
- **[STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)**: Component state management patterns
- **[INTEGRATION_PATTERNS.md](INTEGRATION_PATTERNS.md)**: System integration patterns

## Version History

- **1.0.0**: Extracted composition patterns from main component architecture document (2025-05-23)
