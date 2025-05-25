
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface TenantAwareComponentProps {
  children: React.ReactNode;
  className?: string;
  tenantSpecificProps?: Record<string, any>;
}

export function TenantAwareComponent({
  children,
  className,
  tenantSpecificProps = {}
}: TenantAwareComponentProps) {
  const { tenantId } = useAuth();

  // Apply tenant-specific styling or configuration
  const tenantClassName = cn(
    className,
    tenantId && `tenant-${tenantId.slice(0, 8)}`
  );

  // Merge tenant-specific props
  const enhancedProps = {
    ...tenantSpecificProps
  };

  return (
    <div className={tenantClassName} {...enhancedProps}>
      {children}
    </div>
  );
}

// Hook for tenant-aware styling
export function useTenantStyling() {
  const { tenantId } = useAuth();

  const getTenantClassName = (baseClassName?: string) => {
    return cn(
      baseClassName,
      tenantId && `tenant-scoped`
    );
  };

  const getTenantStyles = () => {
    return {
      '--tenant-primary': '#0f172a',
      '--tenant-secondary': '#64748b',
      '--tenant-accent': '#3b82f6'
    } as React.CSSProperties;
  };

  return {
    tenantId,
    getTenantClassName,
    getTenantStyles,
    tenantConfig: {}
  };
}
