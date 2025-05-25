
import React from 'react';
import { cn } from '@/lib/utils';
import { useResponsive, Breakpoint } from '@/hooks/use-responsive';

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: Partial<Record<Breakpoint, number>>;
  gap?: number | Partial<Record<Breakpoint, number>>;
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { xs: 1, sm: 2, lg: 3, xl: 4 },
  gap = 4,
  className 
}: ResponsiveGridProps) {
  const { breakpoint } = useResponsive();
  
  // Get current column count
  const getCurrentCols = () => {
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (cols[bp] !== undefined) {
        return cols[bp];
      }
    }
    return 1;
  };
  
  // Get current gap
  const getCurrentGap = () => {
    if (typeof gap === 'number') return gap;
    
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (gap[bp] !== undefined) {
        return gap[bp];
      }
    }
    return 4;
  };
  
  const currentCols = getCurrentCols();
  const currentGap = getCurrentGap();
  
  return (
    <div 
      className={cn("grid", className)}
      style={{
        gridTemplateColumns: `repeat(${currentCols}, minmax(0, 1fr))`,
        gap: `${currentGap * 0.25}rem`
      }}
    >
      {children}
    </div>
  );
}

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: Partial<Record<Breakpoint, string>>;
  padding?: Partial<Record<Breakpoint, string>>;
  className?: string;
}

export function ResponsiveContainer({
  children,
  maxWidth = { xs: '100%', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
  padding = { xs: '1rem', sm: '1.5rem', lg: '2rem' },
  className
}: ResponsiveContainerProps) {
  const { breakpoint } = useResponsive();
  
  const getCurrentValue = (values: Partial<Record<Breakpoint, string>>) => {
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp];
      }
    }
    return values.xs || '1rem';
  };
  
  return (
    <div 
      className={cn("w-full mx-auto", className)}
      style={{
        maxWidth: getCurrentValue(maxWidth),
        padding: getCurrentValue(padding)
      }}
    >
      {children}
    </div>
  );
}
